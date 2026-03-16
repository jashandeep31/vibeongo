package bootstrap

import (
	"encoding/json"
	"errors"
	"fmt"
)

type Config struct {
	Packages []Package
	Docker   *DockerConfig
}
type Package struct {
	Name   string          `json:"name"`
	Config json.RawMessage `json:"config"`
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

func ValidateConfig(file []byte) (Config, error) {
	var cfg Config
	if err := json.Unmarshal(file, &cfg); err != nil {
		return cfg, fmt.Errorf("Error in parsing the config: %w", err)
	}

	// validating the docker config

	for _, pkg := range cfg.Packages {
		if pkg.Name == "docker" {

			var dockerConfig DockerConfig

			if err := json.Unmarshal(pkg.Config, &dockerConfig); err != nil {
				return cfg, fmt.Errorf("Error in parsing the config: %w", err)
			}

			for _, container := range dockerConfig.Containers {
				fmt.Println(container.Name)
			}

			//Adding the docker config to the config
			cfg.Docker = &dockerConfig
		}

		if pkg.Name == "opencode" {

			var openCodeConfig OpenCodeConfig

			if err := json.Unmarshal(pkg.Config, &openCodeConfig); err != nil {
				return cfg, fmt.Errorf("Error in parsing the config: %w", err)
			}

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
