package actions

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func InitializeWorkspace(cfg config.Config) error {
	script := `#!/usr/bin/env bash
source /home/ubuntu/.bashrc`

	// Modifying script to clone the git repos at the required locations
	utils.AppendToBashScript(&script, GenerateGitCloneScript(cfg.Repos))
	cmd := exec.Command("sudo", "-u", "ubuntu", "bash", "-lc", script)

	// Direct cmd output need better way to handle logs
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("update command failed: %w", err)
	}
	return nil
}
