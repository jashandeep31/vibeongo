package user

import (
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func CreateUser(systemUser config.SystemUser) error {
	// create user
	_, err := utils.RunCommand(
		"useradd",
		"-m",
		"-s",
		"/bin/bash",
		systemUser.Username,
	)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// add sudo if needed
	if systemUser.IsSudoUser {
		_, err := utils.RunCommand(
			"usermod",
			"-aG",
			"sudo",
			systemUser.Username,
		)
		if err != nil {
			return fmt.Errorf("failed to grant sudo: %w", err)
		}
	}

	return nil
}
