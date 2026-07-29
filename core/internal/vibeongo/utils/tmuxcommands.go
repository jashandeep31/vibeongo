package utils

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func StartTmuxSession(name string, dir string) error {
	cmd := exec.Command("tmux", "new-session", "-d", "-s", name, "-c", dir)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("create tmux session %q in %q: %w: %s", name, dir, err, strings.TrimSpace(string(out)))
	}
	return nil
}

func KilltmuxSession(name string) error {
	cmd := exec.Command("tmux", "kill-session", "-t", name)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("kill tmux session %q: %w: %s", name, err, strings.TrimSpace(string(out)))
	}
	return nil
}

func RunCommandInTmuxSessionInDir(name string, dir string, command string) error {
	// command to create the new window session
	args := []string{
		"tmux", "new-window", // help to create the new window of the tmux
		"-d",               // run in the detach mode
		"-P",               // print information-> prints the detials of the created  window
		"-F", "#{pane_id}", //  Format the output string -> example output %12
		"-t", name, // target session
		"-n", "task", // new window nam
	}
	if dir != "" {
		args = append(args, "-c", dir)
	}
	args = append(args, "bash", "-il") // lauch the interative bash shell

	cmd := exec.Command(args[0], args[1:]...)
	if dir != "" {
		cmd.Dir = dir
	}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("create tmux window task: %w: %s", err, strings.TrimSpace(string(out)))
	}

	// sending  the keys to the tmux to run
	paneID := strings.TrimSpace(string(out))
	if out, err := exec.Command("tmux", "send-keys", "-t", paneID, "-l", command).CombinedOutput(); err != nil {
		return fmt.Errorf("send command to tmux window task: %w: %s", err, strings.TrimSpace(string(out)))
	}
	if out, err := exec.Command("tmux", "send-keys", "-t", paneID, "Enter").CombinedOutput(); err != nil {
		return fmt.Errorf("start command in tmux window task: %w: %s", err, strings.TrimSpace(string(out)))
	}

	return nil
}

func RunScriptInTmuxSession(name string, content string) error {
	tempFile, err := os.CreateTemp("", "temp-*.sh")
	if err != nil {
		return err
	}
	_, err = tempFile.Write([]byte(content))
	if err != nil {
		return err
	}
	err = tempFile.Close()
	if err != nil {
		return err
	}

	err = os.Chmod(tempFile.Name(), 0755)
	if err != nil {
		return err
	}

	cmd := exec.Command(
		"tmux", "new-window",
		"-d",
		"-P",
		"-F", "#{pane_id}",
		"-t", name,
		"-n", "task",
		"bash",
		"-ilc",
		fmt.Sprintf("%s; echo; echo 'DONE'; exec bash", tempFile.Name()),
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed: %w: %s", err, string(out))
	}

	fmt.Println("Created pane:", strings.TrimSpace(string(out)))
	return nil

}
