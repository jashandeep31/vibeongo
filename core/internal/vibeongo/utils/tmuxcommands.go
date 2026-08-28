package utils

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func StartTmuxSession(sessionName string, workingDirectory string, commandToRun string) error {
	startSessionCommand := exec.Command("tmux", "new-session", "-d", "-s", sessionName, "-c", workingDirectory)
	startSessionCommand.Dir = workingDirectory
	output, err := startSessionCommand.CombinedOutput()
	if err != nil {
		return fmt.Errorf("create tmux session %q in %q: %w: %s", sessionName, workingDirectory, err, strings.TrimSpace(string(output)))
	}

	temporaryScriptPath, err := createTemporaryScript(commandToRun)
	if err != nil {
		return err
	}

	targetPane := fmt.Sprintf("%s:0.0", sessionName)
	startupCommand := commandForTemporaryScript(temporaryScriptPath, true)
	if output, err := exec.Command("tmux", "send-keys", "-t", targetPane, "-l", startupCommand).CombinedOutput(); err != nil {
		os.Remove(temporaryScriptPath)
		return fmt.Errorf("send startup script to tmux session: %w: %s", err, strings.TrimSpace(string(output)))
	}
	if output, err := exec.Command("tmux", "send-keys", "-t", targetPane, "Enter").CombinedOutput(); err != nil {
		os.Remove(temporaryScriptPath)
		return fmt.Errorf("start script in tmux session: %w: %s", err, strings.TrimSpace(string(output)))
	}

	return nil
}

func KilltmuxSession(name string) error {
	sessionCommand := exec.Command("tmux", "kill-session", "-t", name)
	out, err := sessionCommand.CombinedOutput()
	if err != nil {
		return fmt.Errorf("kill tmux session %q: %w: %s", name, err, strings.TrimSpace(string(out)))
	}
	return nil
}

func RunCommandInTmuxSessionInDir(name string, dir string, command string) error {
	temporaryScriptPath, err := createTemporaryScript(command)
	if err != nil {
		return err
	}

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
		os.Remove(temporaryScriptPath)
		return fmt.Errorf("create tmux window task: %w: %s", err, strings.TrimSpace(string(out)))
	}

	// sending  the keys to the tmux to run
	paneID := strings.TrimSpace(string(out))
	command = commandForTemporaryScript(temporaryScriptPath, false)
	if out, err := exec.Command("tmux", "send-keys", "-t", paneID, "-l", command).CombinedOutput(); err != nil {
		os.Remove(temporaryScriptPath)
		return fmt.Errorf("send command to tmux window task: %w: %s", err, strings.TrimSpace(string(out)))
	}
	if out, err := exec.Command("tmux", "send-keys", "-t", paneID, "Enter").CombinedOutput(); err != nil {
		os.Remove(temporaryScriptPath)
		return fmt.Errorf("start command in tmux window task: %w: %s", err, strings.TrimSpace(string(out)))
	}

	return nil
}

func createTemporaryScript(content string) (string, error) {
	temporaryScript, err := os.CreateTemp("", "temp-*.sh")
	if err != nil {
		return "", err
	}

	path := temporaryScript.Name()
	if _, err := temporaryScript.Write([]byte(content)); err != nil {
		temporaryScript.Close()
		os.Remove(path)
		return "", err
	}
	if err := temporaryScript.Close(); err != nil {
		os.Remove(path)
		return "", err
	}
	return path, nil
}

func commandForTemporaryScript(path string, keepShellOpen bool) string {
	command := fmt.Sprintf(
		`script=%q; source "$script"; status=$?; printf '\nScript exited with status %%d\n' "$status"`,
		path,
	)
	if keepShellOpen {
		command += "; echo; echo 'DONE'; exec bash"
	}
	return command
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
