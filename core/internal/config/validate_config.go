package config

import (
	"encoding/json"
	"fmt"
	"os"
)

type Config struct {
	Token    string          `json:"token"`
	Packages []PackageConfig `json:"packages"`
	Repos    []GitRepoConfig `json:"repos"`
	Docker   *DockerConfig   `json:"-"`
	OpenCode *OpenCodeConfig `json:"-"`
	Nvim     *NvimConfig     `json:"-"`
	Tasks    []TaskConfig    `json:"tasks"`
}

type TaskConfig struct {
	FolderName string `json:"folder_name"`
	Task       string `json:"task"`
}

type PackageConfig struct {
	Name    string          `json:"name"`
	Config  json.RawMessage `json:"config"`
	Enabled bool            `json:"enabled"`
}

type DockerContainerConfig struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

type DockerConfig struct {
	Containers []DockerContainerConfig `json:"containers"`
}

type GitRepoConfig struct {
	URL         string `json:"clone_url"`
	RepoUrl     string `json:"repo_url"`
	SetupScript string `json:"setup_script"`
	FolderName  string `json:"folder_name"`
	AccessToken string `json:"access_token"`
	Public      bool   `json:"public"`
}

type OpenCodeConfig struct {
	AuthJSON json.RawMessage `json:"auth_json"`
}

type NvimConfig struct {
	ConfigJSON json.RawMessage `json:"config_json"`
}

func ValidateConfig(file []byte) (Config, error) {
	var cfg Config
	if err := json.Unmarshal(file, &cfg); err != nil {
		return cfg, fmt.Errorf("error parsing config: %w", err)
	}

	for _, pkg := range cfg.Packages {
		switch pkg.Name {
		case "docker":
			var dockerConfig DockerConfig
			if err := json.Unmarshal(pkg.Config, &dockerConfig); err != nil {
				return cfg, fmt.Errorf("error parsing docker package config: %w", err)
			}
			cfg.Docker = &dockerConfig
		case "opencode":
			var openCodeConfig OpenCodeConfig
			if err := json.Unmarshal(pkg.Config, &openCodeConfig); err != nil {
				return cfg, fmt.Errorf("error parsing opencode package config: %w", err)
			}
			cfg.OpenCode = &openCodeConfig
		case "nvim":
			var nvimConfig NvimConfig
			if err := json.Unmarshal(pkg.Config, &nvimConfig); err != nil {
				return cfg, fmt.Errorf("error parsing nvim package config: %w", err)
			}
			cfg.Nvim = &nvimConfig
		}
	}

	return cfg, nil
}

// LoadAndValidate

// LoadAndValidate loads the config file and validates it.
func LoadAndValidate(filename string) (Config, error) {
	file, err := loadConfig(filename)
	if err != nil {
		return Config{}, err
	}

	return ValidateConfig(file)
}

func loadConfig(filename string) ([]byte, error) {
	file, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("Failed to load the config: %w", err)
	}
	return file, nil
}
