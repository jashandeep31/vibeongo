package utils

import (
	"fmt"
	"os/exec"
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

func RunCommandInTmuxSession(name string, pane int, command string) error {
	cmd := exec.Command(
		"tmux", "new-window",
		"-d",
		"-t", name,
		"-n", fmt.Sprintf("task-%d", pane),
		command,
	)

	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%v: %s", err, out)
	}

	return nil
}
