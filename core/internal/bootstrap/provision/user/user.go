package user

import (
	"fmt"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func checkRootPrivileges() error {
	if os.Getuid() != 0 {
		return fmt.Errorf("this script must be run as root or with sudo (current UID: %d)", os.Getuid())
	}
	return nil
}

func CreateUser(systemUser config.SystemUser) error {
	// Check for root/sudo before doing anything
	if err := checkRootPrivileges(); err != nil {
		return err
	}

	// Check if user already exists to avoid duplicate error
	_, err := utils.RunCommand("id", "-u", systemUser.Username)
	if err == nil {
		return fmt.Errorf("user %s already exists", systemUser.Username)
	}

	// Create user
	_, err = utils.RunCommand(
		"useradd",
		"-m",
		"-s",
		"/bin/bash",
		systemUser.Username,
	)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// Add sudo if needed
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
