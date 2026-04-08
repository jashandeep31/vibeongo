package commands

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/fatih/color"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/cli/provisions"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/spf13/cobra"
)

func VpsSetupCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "init-workspace",
		Short: "Initialize the VPS environment and clone repositories",
		Long:  "Reads the configuration and sets up the base environment by cloning required Git repositories into the workspace.",
		RunE: func(cmd *cobra.Command, args []string) error {
			vpsSetup()
			return nil
		},
	}
}

func vpsSetup() error {
	fmt.Println("v0.0.5")
	fmt.Println("")
	color.Cyan("Welcome, We are setting the system up for you")
	color.Yellow("it may take a while")
	fmt.Println("")
	fmt.Println("")

	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return fmt.Errorf("config has error: %w", err)
	}

	script := `#!/usr/bin/env bash
source /home/ubuntu/.bashrc`

	// Modifying script to clone the git repos at the required locations
	utils.AppendToBashScript(&script, provisions.SetupGitRepos(cfg.Repos))
	cmd := exec.Command("sudo", "-u", "ubuntu", "bash", "-lc", script)

	// Direct cmd output need better way to handle logs
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("update command failed: %w", err)
	}
	return nil
}
