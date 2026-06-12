package actions

import (
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func ExecuteIntialScript() error {
	cfg, err := config.LoadAndValidate("config.json")
	ProvisionOpenCode(cfg.OpenCode)
	if err != nil {
		return err
	}

	tempScriptFile, err := os.CreateTemp("", "temp.sh")
	if err != nil {
		return err
	}
	defer tempScriptFile.Close()
	defer os.Remove(tempScriptFile.Name())

	exec.Command("mkdir", "-p", "/home/ubuntu/code").Run()
	exec.Command("sudo", "chown", "-R", "ubuntu:ubuntu", "/home/ubuntu/code").Run()

	script := `
	echo "intial script is running"
	`
	script = script + cfg.InitialScript
	path := "/home/ubuntu/code"
	tempScriptFile.Write([]byte(script))

	cmd := utils.ExecCommand(utils.SudoShellScriptFile, tempScriptFile.Name())
	cmd.Dir = path
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err = cmd.Run()
	if err != nil {
		return err
	}

	return nil
}

func ExecuteFinalScript() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}

	re := regexp.MustCompile(`(?m)^---\s*$`)
	parts := re.Split(cfg.FinalScript, -1)

	if err := ensureFinalSession(); err != nil {
		return err
	}

	for i, part := range parts {
		if strings.TrimSpace(part) == "" {
			continue
		}

		tempScriptFile, err := os.CreateTemp("", "temp-*.sh")
		if err != nil {
			return err
		}

		if _, err := tempScriptFile.Write([]byte(part)); err != nil {
			tempScriptFile.Close()
			os.Remove(tempScriptFile.Name())
			return err
		}

		if err := tempScriptFile.Close(); err != nil {
			os.Remove(tempScriptFile.Name())
			return err
		}

		if err := os.Chmod(tempScriptFile.Name(), 0755); err != nil {
			os.Remove(tempScriptFile.Name())
			return err
		}
		createWindow := exec.Command(
			"tmux", "new-window",
			"-d",
			"-P",
			"-F", "#{pane_id}",
			"-t", "final:",
			"-n", fmt.Sprintf("task-%d", i),
			"bash", "-il",
		)
		output, err := createWindow.CombinedOutput()
		if err != nil {
			os.Remove(tempScriptFile.Name())
			return fmt.Errorf("create tmux window task-%d: %w: %s", i, err, strings.TrimSpace(string(output)))
		}

		paneID := strings.TrimSpace(string(output))
		runScript := fmt.Sprintf(
			`script=%q; source "$script"; status=$?; rm -f "$script"; printf '\nFinal script exited with status %%d\n' "$status"`,
			tempScriptFile.Name(),
		)
		if output, err := exec.Command("tmux", "send-keys", "-t", paneID, "-l", runScript).CombinedOutput(); err != nil {
			os.Remove(tempScriptFile.Name())
			return fmt.Errorf("send final script to tmux window task-%d: %w: %s", i, err, strings.TrimSpace(string(output)))
		}
		if output, err := exec.Command("tmux", "send-keys", "-t", paneID, "Enter").CombinedOutput(); err != nil {
			os.Remove(tempScriptFile.Name())
			return fmt.Errorf("start final script in tmux window task-%d: %w: %s", i, err, strings.TrimSpace(string(output)))
		}
	}

	return nil
}

func ensureFinalSession() error {
	if err := exec.Command("tmux", "has-session", "-t", "final").Run(); err != nil {
		if output, createErr := exec.Command("tmux", "new-session", "-d", "-s", "final").CombinedOutput(); createErr != nil {
			return fmt.Errorf("create tmux session final: %w: %s", createErr, strings.TrimSpace(string(output)))
		}
	}

	return nil
}
