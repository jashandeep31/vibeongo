package bootstrap

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func ValidateConfig(file []byte) (config.Config, error) {
	var cfg config.Config
	if err := json.Unmarshal(file, &cfg); err != nil {
		return cfg, fmt.Errorf("Error in parsing the config: %w", err)
	}

	// validating the docker config

	for _, pkg := range cfg.Packages {
		if pkg.Name == "docker" {
			fmt.Println("docker is here")

			var dockerConfig DockerConfig

			if err := json.Unmarshal(pkg.Config, &dockerConfig); err != nil {
				return cfg, fmt.Errorf("Error in parsing the config: %w", err)
			}

			for _, container := range dockerConfig.Containers {
				fmt.Println(container.Name)
			}
		}
		if pkg.Name == "opencode" {
			var openCodeConfig OpenCodeConfig
			if err := json.Unmarshal(pkg.Config, &openCodeConfig); err != nil {
				return cfg, fmt.Errorf("Error in parsing the config: %w", err)
			}
			authJson := openCodeConfig.AuthJson
			fmt.Println(string(authJson))
		}
		if pkg.Name == "nvim" {

			// 1. install the nvim
			// 2. git clone the repo in the nvim folder
			// fmt.Println("gitpod is here", string(pkg.Config))
		}
	}
	// TODO: move all the validation to the config file here so no shit can happen on the go
	// TODO: use colors to print the validation and other messages

	return cfg, errors.New("this is custom generated error")
	// return cfg, nil
}

type DockerContainerConfig struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

type DockerConfig struct {
	Containers []DockerContainerConfig `json:"containers"`
}

type OpenCodeConfig struct {
	AuthJson json.RawMessage `json:"auth_json"`
}
