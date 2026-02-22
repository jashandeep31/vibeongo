package bootstrap

import (
	"encoding/json"
	"fmt"
)

type SystemUser struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type Package struct {
	Name    string `json:"name" validate:"required"`
	Enabled bool   `json:"enabled" validate:"required"`
	Config  any    `json:"config"`
}

type Config struct {
	OS         string     `json:"os" validate:"required"`
	SystemUser SystemUser `json:"system_user" validate:"required"`
	Packages   []Package  `json:"packages" validate:"required,dive"`
}

func ValidateConfig(file []byte) (Config, error) {
	var cfg Config
	if err := json.Unmarshal(file, &cfg); err != nil {
		return cfg, fmt.Errorf("Error in parsing the config: %w", err)
	}

	// fmt.Println("Config successfully parsed:")
	// fmt.Println(cfg)

	for _, pkg := range cfg.Packages {
		fmt.Println(pkg.Name)
	}
	return cfg, nil
}
