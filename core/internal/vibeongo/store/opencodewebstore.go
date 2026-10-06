package store

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
)

type OpencodeWeb struct {
	mu      sync.RWMutex
	started bool
}

const (
	opencodeReadyTimeout  = 5 * time.Second
	opencodeReadyInterval = time.Second
)

var opencodeRetryTimeouts = [...]time.Duration{
	8 * time.Second,
	10 * time.Second,
	10 * time.Second,
}

func NewOpencodeWeb() *OpencodeWeb {
	return &OpencodeWeb{}
}

func (o *OpencodeWeb) IsRunning() bool {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return false
	}
	client := &http.Client{Timeout: time.Second}
	return opencodeResponding(client, "http://127.0.0.1:4096/global/health", cfg.InstanceConfig.OpencodePassword)
}

func opencodeResponding(client *http.Client, url, password string) bool {
	request, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return false
	}
	request.SetBasicAuth("opencode", password)
	response, err := client.Do(request)
	if err != nil {
		return false
	}
	defer response.Body.Close()
	return response.StatusCode == http.StatusOK
}

func startWebServerLocked() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	if cfg.OpenCode == nil {
		return fmt.Errorf("opencode is not configured")
	}

	projectDir := utils.WorkspaceDirectory()
	if err := validateOpencodePassword(cfg.InstanceConfig.OpencodePassword); err != nil {
		return err
	}

	// Appending password to the opencode each time
	err = utils.StartTmuxSession("ops", projectDir, "OPENCODE_SERVER_PASSWORD="+cfg.InstanceConfig.OpencodePassword+" opencode serve --port 4096 --hostname 0.0.0.0")

	if err != nil {
		return err
	}
	return nil
}

func validateOpencodePassword(password string) error {
	if strings.TrimSpace(password) == "" {
		return fmt.Errorf("opencode password is missing")
	}
	return nil
}

func (o *OpencodeWeb) StartWebServer() error {
	o.mu.Lock()
	defer o.mu.Unlock()
	if o.started {
		return nil
	}
	err := startWebServerLocked()
	if err != nil {
		return err
	}
	o.started = true
	return nil
}

func (o *OpencodeWeb) RestartWebServer() error {
	o.mu.Lock()
	defer o.mu.Unlock()

	if !o.started {
		return nil
	}
	_ = utils.KilltmuxSession("ops")
	o.started = false
	err := startWebServerLocked()
	if err != nil {
		return err
	}
	o.started = true
	return nil
}

func (o *OpencodeWeb) StopWebServer() error {
	o.mu.Lock()
	defer o.mu.Unlock()
	err := utils.KilltmuxSession("ops")
	if err != nil {
		return err
	}
	o.started = false
	return nil
}

func waitForOpencodeReady(isRunning func() bool, timeout, interval time.Duration) bool {
	return waitForOpencodeReadyContext(context.Background(), isRunning, timeout, interval)
}

func waitForOpencodeReadyContext(ctx context.Context, isRunning func() bool, timeout, interval time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for {
		if ctx.Err() != nil {
			return false
		}
		if isRunning() {
			return true
		}
		if !time.Now().Before(deadline) {
			return false
		}
		select {
		case <-ctx.Done():
			return false
		case <-time.After(interval):
		}
	}
}

// StartWebServerWithRetry waits for the HTTP endpoint after startup and
// retries the tmux process up to three times if it does not become ready.
func (o *OpencodeWeb) StartWebServerWithRetry() error {
	return o.StartWebServerWithRetryContext(context.Background())
}

func (o *OpencodeWeb) StartWebServerWithRetryContext(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	startErr := o.StartWebServer()
	if waitForOpencodeReadyContext(ctx, o.IsRunning, opencodeReadyTimeout, opencodeReadyInterval) {
		fmt.Println("opencode web server ready after initial start")
		return nil
	}
	if startErr != nil {
		fmt.Printf("opencode web server initial start failed: %v\n", startErr)
	} else {
		fmt.Printf("opencode web server initial start did not become ready within %s\n", opencodeReadyTimeout)
	}

	var retryErr error
	for i, timeout := range opencodeRetryTimeouts {
		if err := ctx.Err(); err != nil {
			return err
		}
		attempt := i + 1
		fmt.Printf("opencode web server retry %d/%d: restarting; waiting up to %s for health\n", attempt, len(opencodeRetryTimeouts), timeout)

		o.mu.RLock()
		started := o.started
		o.mu.RUnlock()

		if started {
			retryErr = o.RestartWebServer()
		} else {
			// A failed start may still have left the dedicated tmux session behind.
			_ = utils.KilltmuxSession("ops")
			retryErr = o.StartWebServer()
		}
		if retryErr != nil {
			fmt.Printf("opencode web server retry %d/%d failed to start: %v\n", attempt, len(opencodeRetryTimeouts), retryErr)
			continue
		}
		if waitForOpencodeReadyContext(ctx, o.IsRunning, timeout, opencodeReadyInterval) {
			fmt.Printf("opencode web server ready after retry %d/%d\n", attempt, len(opencodeRetryTimeouts))
			return nil
		}
		fmt.Printf("opencode web server retry %d/%d: health endpoint did not return 200 within %s\n", attempt, len(opencodeRetryTimeouts), timeout)
	}

	if retryErr != nil {
		return fmt.Errorf("opencode web server failed after %d retries: %w", len(opencodeRetryTimeouts), retryErr)
	}
	return fmt.Errorf("opencode health endpoint did not return 200 after %d retries", len(opencodeRetryTimeouts))
}
