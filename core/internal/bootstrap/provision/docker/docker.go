package docker

import (
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Installer(pkg config.Package, systemUser config.SystemUser) error {
	err := installDocker(systemUser)
	if err != nil {
		return err
	}

	// Composing up the docker containers
	if err := ComposeContainers(pkg); err != nil {
		return err
	}

	return nil
}
