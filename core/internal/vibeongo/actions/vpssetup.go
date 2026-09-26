package actions

import (
	"fmt"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
)

func InitializeWorkspace(cfg config.Config) error {
	script := utils.ReplaceUsernamePlaceholder(`#!/usr/bin/env bash
source /home/_USERNAME_/.bashrc`)

	// Modifying script to clone the git repos at the required locations
	utils.AppendToBashScript(&script, GenerateGitCloneScript(cfg.Repos))
	cmd := utils.ExecCommand(utils.SudoUbuntuLoginShell, script)

	// Direct cmd output need better way to handle logs
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("update command failed: %w", err)
	}
	return nil
}
