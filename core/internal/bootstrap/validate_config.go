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

func ValidateConfig(file []byte) {
	var cfg Config
	if err := json.Unmarshal([]byte(file), &cfg); err != nil {
		fmt.Println("Json is pared")
	}

	fmt.Println(cfg)
}
