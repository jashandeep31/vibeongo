package actions

import (
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
)

// ReExecuteDevScript restarts the dev tmux session and runs the dev script.
func ReExecuteDevScript() error {
	return ExecuteDevScript()
}

func ExecuteSetupScript() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}

	tempScriptFile, err := os.CreateTemp("", "temp.sh")
	if err != nil {
		return err
	}
	defer os.Remove(tempScriptFile.Name())

	path := utils.WorkspaceDirectory()
	exec.Command("mkdir", "-p", path).Run()
	exec.Command("sudo", "chown", "-R", utils.CurrentUser.Username+":"+utils.CurrentUser.Username, path).Run()

	script := utils.ReplaceUsernamePlaceholder(`#!/usr/bin/env bash
source /home/_USERNAME_/.bashrc
export NVM_DIR="/home/_USERNAME_/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
echo "initial script is running"
`)
	script = script + cfg.InitialScript
	if _, err := tempScriptFile.Write([]byte(script)); err != nil {
		return err
	}
	if err := tempScriptFile.Close(); err != nil {
		return err
	}
	if err := os.Chmod(tempScriptFile.Name(), 0o755); err != nil {
		return err
	}

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
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	if err := ProvisionOpenCode(cfg.OpenCode); err != nil {
		return err
	}
	if err := ProvisionCodex(cfg.Codex); err != nil {
		return err
	}
	tempScriptFile, err := os.CreateTemp("", "temp-*.sh")
	if err != nil {
		return err
	}
	defer os.Remove(tempScriptFile.Name())

	path := utils.WorkspaceDirectory()
	exec.Command("mkdir", "-p", path).Run()
	exec.Command("sudo", "chown", "-R", utils.CurrentUser.Username+":"+utils.CurrentUser.Username, path).Run()

	script := utils.ReplaceUsernamePlaceholder(`#!/usr/bin/env bash
source /home/_USERNAME_/.bashrc
export NVM_DIR="/home/_USERNAME_/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
echo "final script is running"
`)
	script = script + cfg.FinalScript
	if _, err := tempScriptFile.Write([]byte(script)); err != nil {
		return err
	}
	if err := tempScriptFile.Close(); err != nil {
		return err
	}
	if err := os.Chmod(tempScriptFile.Name(), 0o755); err != nil {
		return err
	}

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

func ExecuteDevScript() error {
	fmt.Println("Running the dev script")
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}

	re := regexp.MustCompile(`(?m)^---\s*$`)
	parts := re.Split(cfg.DevScript, -1)

	_ = utils.KilltmuxSession("dev")
	sessionStarted := false
	path := utils.WorkspaceDirectory()

	for i, part := range parts {
		if strings.TrimSpace(part) == "" {
			continue
		}

		if !sessionStarted {
			if err := utils.StartTmuxSession("dev", path, part); err != nil {
				return err
			}
			sessionStarted = true
			continue
		}

		if err := utils.RunCommandInTmuxSessionInDir("dev", path, part); err != nil {
			return fmt.Errorf("run dev script in tmux window task-%d: %w", i, err)
		}
	}

	return nil
}
