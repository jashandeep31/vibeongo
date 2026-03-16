package utils

import (
	"encoding/json"
	"fmt"
)

type Config struct {
	Packages []Package
	Docker   DockerConfig
	OpenCode OpenCodeConfig
	Nvim     NvimConfig
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

type NvimConfig struct {
	ConfigJson json.RawMessage `json:"config_json"`
}

func ValidateConfig(file []byte) (Config, error) {
	var cfg Config
	if err := json.Unmarshal(file, &cfg); err != nil {
		return cfg, fmt.Errorf("Error in parsing the config: %w", err)
	}

	// Validate packages configuration
	for _, pkg := range cfg.Packages {
		switch pkg.Name {
		case "docker":
			var dockerConfig DockerConfig
			if err := json.Unmarshal(pkg.Config, &dockerConfig); err != nil {
				return cfg, fmt.Errorf("Error in parsing the config: %w", err)
			}
			cfg.Docker = dockerConfig

		case "opencode":
			var openCodeConfig OpenCodeConfig
			if err := json.Unmarshal(pkg.Config, &openCodeConfig); err != nil {
				return cfg, fmt.Errorf("Error in parsing the config: %w", err)
			}
			cfg.OpenCode = openCodeConfig

		case "nvim":
			var nvimConfig NvimConfig
			if err := json.Unmarshal(pkg.Config, &nvimConfig); err != nil {
				return cfg, fmt.Errorf("Error in parsing the config: %w", err)
			}
			cfg.Nvim = nvimConfig
		}
	}

	return cfg, nil
}
