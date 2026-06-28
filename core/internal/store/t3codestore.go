package store

import (
	"fmt"
	"regexp"
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
	if err := utils.StartTmuxSession("t3Code", "/home/ubuntu/code"); err != nil {
		return fmt.Errorf("start t3 code tmux session: %w", err)
	}
	if err := utils.RunCommandInTmuxSession("t3Code", "t3 serve --host 0.0.0.0 --no-browser"); err != nil {
		return fmt.Errorf("run t3 code serve command: %w", err)
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
		return fmt.Errorf("stop t3 code tmux session: %w", err)
	}
	c.Running = false
	return nil
}

func (c *T3Code) GetPassword() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Password
}

func (c *T3Code) Status() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Running
}
func (c *T3Code) SetAndGetPassword() (string, error) {
	// cmd := exec.Command("t3", "auth", "pairing", "create")
	cmd := utils.ExecCommand(utils.SudoUbuntuInterativeShell, "t3 auth session create")

	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", err
	}

	re := regexp.MustCompile(`Token:\s*(\S+)`)
	match := re.FindSubmatch(out)
	if len(match) < 2 {
		return "", fmt.Errorf("token not found")
	}

	token := string(match[1])
	c.mu.Lock()
	c.Password = token
	c.mu.Unlock()

	return token, nil
}

func (c *T3Code) RestartT3Code() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	_ = utils.KilltmuxSession("t3Code")
	c.Running = false

	if err := c.startT3CodePreLocked(); err != nil {
		return fmt.Errorf("restart t3 code: %w", err)
	}
	c.Running = true
	return nil
}
