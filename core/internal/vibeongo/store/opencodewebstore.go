package store

import (
	"fmt"
	"strings"
	"sync"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
)

type OpencodeWeb struct {
	mu      sync.RWMutex
	Running bool
}

func NewOpencodeWeb() *OpencodeWeb {
	return &OpencodeWeb{}
}

func (o *OpencodeWeb) IsRunning() bool {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return o.Running
}

func startWebServerLocked() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	if cfg.OpenCode == nil {
		return fmt.Errorf("opencode is not configured")
	}

	const projectDir = "/home/ubuntu/code"
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
	if o.Running {
		return nil
	}
	err := startWebServerLocked()
	if err != nil {
		return err
	}
	o.Running = true
	return nil
}

func (o *OpencodeWeb) RestartWebServer() error {
	o.mu.Lock()
	defer o.mu.Unlock()

	if !o.Running {
		return nil
	}
	_ = utils.KilltmuxSession("ops")
	o.Running = false
	err := startWebServerLocked()
	if err != nil {
		return err
	}
	o.Running = true
	return nil
}

func (o *OpencodeWeb) StopWebServer() error {
	o.mu.Lock()
	defer o.mu.Unlock()
	err := utils.KilltmuxSession("ops")
	if err != nil {
		return err
	}
	o.Running = false
	return nil
}
