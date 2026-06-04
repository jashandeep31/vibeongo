package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	ServerBaseUrl string          `json:"serverBaseUrl"`
	SessionId     string          `json:"sessionId"`
	ProjectId     string          `json:"projectId"`
	InstanceId    string          `json:"instanceId"`
	Token         string          `json:"token"`
	Packages      []PackageConfig `json:"packages"`
	Repos         []GitRepoConfig `json:"repos"`
	Docker        *DockerConfig   `json:"docker"`
	OpenCode      *OpenCodeConfig `json:"opencode"`
	Nvim          *NvimConfig     `json:"nvim"`
	Tasks         []TaskConfig    `json:"tasks"`
	InitialScript string          `json:"initialScript"`
	FinalScript   string          `json:"finalScript"`
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
	FullName    string `json:"full_name"`
	AccessToken string `json:"access_token"`
	FolderName  string `json:"folder_name"`
	Public      bool   `json:"public"`
	SetupScript string `json:"setup_script"`
}

type OpenCodeConfig struct {
	AuthJSON json.RawMessage `json:"auth_json"`
	Model    string          `json:"model"`
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

var configPath = filepath.Join("/home/ubuntu/.config/vibeongo", "config.json")

func LoadAndValidate(filename string) (Config, error) {
	file, err := os.ReadFile(configPath)
	if err != nil {
		tempfile, err := os.ReadFile("config.json")
		if err != nil {
			return Config{}, fmt.Errorf("config not found at %s", configPath)
		}
		return ValidateConfig(tempfile)
	}

	return ValidateConfig(file)
}
