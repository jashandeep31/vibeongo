package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	PublicIp       string          `json:"publicIp"`
	ServerBaseURL  string          `json:"serverBaseUrl"`
	SessionID      string          `json:"sessionId"`
	ProjectID      string          `json:"projectId"`
	InstanceConfig InstanceConfig  `json:"instanceConfig"`
	InstanceID     string          `json:"instanceId"`
	Packages       []PackageConfig `json:"packages"`
	Repos          []GitRepoConfig `json:"repos"`
	Docker         *DockerConfig   `json:"docker"`
	OpenCode       *OpenCodeConfig `json:"opencode"`
	Codex          *CodexConfig    `json:"codex"`
	Nvim           *NvimConfig     `json:"nvim"`
	Tasks          []TaskConfig    `json:"tasks"`
	InitialScript  string          `json:"initialScript"`
	FinalScript    string          `json:"finalScript"`
	DevScript      string          `json:"devScript"`
}
type InstanceConfig struct {
	OpencodePassword   string `json:"opencodePassword"`
	Terminate          bool   `json:"terminate"`
	VibeongoLocalToken string `json:"vibeongoLocalToken"`
	SessionToken       string `json:"sessionToken"`
}

type TaskConfig struct {
	ID         string `json:"id"`
	Done       bool   `json:"done"`
	FolderName string `json:"folder_name"`
	Agent      string `json:"agent"`
	Model      string `json:"model"`
	Task       string `json:"task"`
}

type PackageConfig struct {
	Name    string          `json:"name"`
	Config  json.RawMessage `json:"config"`
	Enabled bool            `json:"enabled"`
}

type DockerContainerConfig struct {
	Name              string `json:"name"`
	DockerComposeCode string `json:"dockercomposecode"`
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
	AuthJSON        json.RawMessage `json:"auth_json"`
	Model           string          `json:"model"`
	RequirePassword bool            `json:"requirePassword"`
}

type CodexConfig struct {
	AuthJSON json.RawMessage `json:"auth_json"`
}

type NvimConfig struct {
	ConfigJSON json.RawMessage `json:"config_json"`
}

func calidateConfig(file []byte) (Config, error) {
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
		case "codex":
			var codexConfig CodexConfig
			if err := json.Unmarshal(pkg.Config, &codexConfig); err != nil {
				return cfg, fmt.Errorf("error parsing opencode package config: %w", err)
			}
			cfg.Codex = &codexConfig

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

func ResolveConfigPath() (string, error) {
	if _, err := os.Stat(configPath); err == nil {
		return configPath, nil
	}
	if _, err := os.Stat("config.json"); err == nil {
		return "config.json", nil
	}
	return "", fmt.Errorf("config not found at %s", configPath)
}

func LoadAndValidate() (Config, error) {
	path, err := ResolveConfigPath()
	if err != nil {
		return Config{}, err
	}

	file, err := os.ReadFile(path)
	if err != nil {
		return Config{}, err
	}
	return calidateConfig(file)
}
