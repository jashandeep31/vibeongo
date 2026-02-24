package docker

import (
	"encoding/json"
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Installer(pkg config.Package, systemUser config.SystemUser) error {
	// err := installDocker(sysmtemUser)
	// if err != nil {
	// 	return err
	// }

	// run the config docker container
	return nil
}

type Container struct {
	Name           string `json:"name"`
	ComposeFileURL string `json:"compose_file_url"`
}

type DockerContainersConfig struct {
	Containers []Container `json:"containers"`
}

func ScriptValidator(pkg config.Package) error {
	var cfg DockerContainersConfig
	if err := json.Unmarshal(pkg.Config, &cfg); err != nil {
		return err
	}

	for _, container := range cfg.Containers {
		// clone the docker compose script
		fmt.Println(container.ComposeFileURL)
	}
	return nil
}
