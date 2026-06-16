package utils

import (
	"fmt"
	"os/exec"
	"strings"
)

func StartTmuxSession(name string, dir string) error {
	cmd := exec.Command("tmux", "new-session", "-d", "-s", name)
	cmd.Dir = dir
	return cmd.Run()
}

func KilltmuxSession(name string) error {
	cmd := exec.Command("tmux", "kill-session", "-t", name)
	return cmd.Run()
}

func RunCommandInTmuxSession(name string, command string) error {
	cmd := exec.Command(
		"tmux", "new-window",
		"-d",
		"-P",
		"-F", "#{pane_id}",
		"-t", name,
		"-n", "task",
		"bash", "-il",
	)

	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("create tmux window task: %w: %s", err, strings.TrimSpace(string(out)))
	}

	paneID := strings.TrimSpace(string(out))
	if out, err := exec.Command("tmux", "send-keys", "-t", paneID, "-l", command).CombinedOutput(); err != nil {
		return fmt.Errorf("send command to tmux window task: %w: %s", err, strings.TrimSpace(string(out)))
	}
	if out, err := exec.Command("tmux", "send-keys", "-t", paneID, "Enter").CombinedOutput(); err != nil {
		return fmt.Errorf("start command in tmux window task: %w: %s", err, strings.TrimSpace(string(out)))
	}

	return nil
}
