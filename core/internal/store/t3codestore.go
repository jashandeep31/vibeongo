package store

import (
	"sync"

	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

type T3Code struct {
	mu       sync.RWMutex
	Running  bool
	Password string
}

func NewT3Code() *T3Code {
	return &T3Code{}
}

func (c *T3Code) startT3CodePreLocked() error {
	err := utils.StartTmuxSession("t3Code", "/home/ubunut/code")
	if err != nil {
		return err
	}
	err = utils.RunCommandInTmuxSession("t3Code", "t3 serve --host 0.0.0.0 --no-browser")
	if err != nil {
		return err
	}
	return nil
}

func (c *T3Code) StartT3Code() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.Running {
		return nil
	}
	// spin up the new with the tmux session
	if err := c.startT3CodePreLocked(); err != nil {
		return err
	}
	c.Running = true
	return nil
}

func (c *T3Code) StopT3Code() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.Running {
		return nil
	}
	if err := utils.KilltmuxSession("t3Code"); err != nil {
		return err
	}
	c.Running = false
	return nil
}

func (c *T3Code) GetPassword() string {
	return c.Password
}

func (c *T3Code) Status() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Running
}

func (c *T3Code) RestartT3Code() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	_ = utils.KilltmuxSession("t3Code")
	c.Running = false

	if err := c.startT3CodePreLocked(); err != nil {
		return err
	}
	c.Running = true
	return nil
}
