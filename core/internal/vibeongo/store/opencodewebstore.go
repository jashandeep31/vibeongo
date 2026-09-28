package store

import (
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

// StartWebServerWithRetry checks the HTTP endpoint after startup and retries
// the tmux process once if the endpoint is not responding.
func (o *OpencodeWeb) StartWebServerWithRetry() error {
	startErr := o.StartWebServer()
	time.Sleep(2 * time.Second)
	if o.IsRunning() {
		return nil
	}

	o.mu.RLock()
	started := o.started
	o.mu.RUnlock()

	var retryErr error
	if started {
		retryErr = o.RestartWebServer()
	} else {
		// A failed start may still have left the dedicated tmux session behind.
		_ = utils.KilltmuxSession("ops")
		retryErr = o.StartWebServer()
	}
	if retryErr != nil {
		if startErr != nil {
			return fmt.Errorf("opencode initial start failed: %v; retry failed: %w", startErr, retryErr)
		}
		return fmt.Errorf("opencode restart failed: %w", retryErr)
	}

	time.Sleep(2 * time.Second)
	if !o.IsRunning() {
		return fmt.Errorf("opencode health endpoint did not return 200 after retry")
	}
	return nil
}
