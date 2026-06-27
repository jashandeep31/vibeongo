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
	return c.startT3CodePreLocked()
}

func (c *T3Code) StopT3Code() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.Running {
		return nil
	}
	err := utils.KilltmuxSession("t3Code")
	return err
}

func (c *T3Code) RestartT3Code() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	_ = utils.KilltmuxSession("t3Code")

	return c.startT3CodePreLocked()
}
