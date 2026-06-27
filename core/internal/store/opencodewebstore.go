package store

import (
	"fmt"
	"sync"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
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
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}
	if cfg.OpenCode == nil {
		return fmt.Errorf("opencode is not configured")
	}

	err = utils.StartTmuxSession("ops", "/home/ubuntu/code")
	if err != nil {
		return err
	}

	if cfg.OpenCode.RequirePassword {
		err = utils.RunCommandInTmuxSession("ops", "OPENCODE_SERVER_PASSWORD="+cfg.InstanceConfig.OpencodePassword+" OPENCODE_SERVER_USERNAME=vibe opencode web --port 4096 --hostname 0.0.0.0")
	} else {
		err = utils.RunCommandInTmuxSession("ops", "opencode web --port 4096 --hostname 0.0.0.0")
	}
	if err != nil {
		return err
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
	err := utils.KilltmuxSession("ops")
	if err != nil {
		return err
	}
	o.Running = false

	err = startWebServerLocked()
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
