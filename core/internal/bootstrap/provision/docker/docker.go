package docker

import (
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Installer(pkg config.Package, systemUser config.SystemUser) error {
	_ = systemUser

	cfg, err := configValidator(pkg.Config)
	if err != nil {
		return fmt.Errorf("invalid docker package config: %w", err)
	}

	// err := installDocker(sysmtemUser)
	// if err != nil {
	// 	return err
	// }

	// run the config docker container
	printContainerRunCommands(cfg)
	return nil
}

func ScriptValidator(pkg config.Package) error {
	cfg, err := configValidator(pkg.Config)
	if err != nil {
		return fmt.Errorf("invalid docker package config: %w", err)
	}
	fmt.Println(cfg)

	return nil
}

func printContainerRunCommands(cfg dockerConfig) {
	fmt.Println("Docker config is valid.")
	fmt.Println("Run the following command(s) to start container(s):")
	for _, ctr := range cfg.Containers {
		fmt.Println(buildDockerRunCommand(ctr))
	}
}
