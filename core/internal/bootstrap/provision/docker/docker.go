package docker

import (
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Installer(pkg config.Package, systemUser config.SystemUser) error {
	err := installDocker(systemUser)
	if err != nil {
		return err
	}

	// validating the script
	if err := RunContainers(pkg); err != nil {
		return err
	}

	// run the config docker container
	return nil
}
