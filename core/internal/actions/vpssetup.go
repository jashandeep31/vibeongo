package actions

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/fatih/color"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func InitializeWorkspace(cfg config.Config) error {
	fmt.Println("v0.0.5")
	fmt.Println("")
	color.Cyan("Welcome, We are setting the system up for you")
	color.Yellow("it may take a while")
	fmt.Println("")
	fmt.Println("")

	ProvisionOpenCode(cfg.OpenCode)

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
