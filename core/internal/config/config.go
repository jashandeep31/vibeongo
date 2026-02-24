package config

import "encoding/json"

type SystemUser struct {
	Username   string `json:"username" validate:"required"`
	Password   string `json:"password" validate:"required"`
	IsSudoUser bool   `json:"is_sudo_user"`
}

type Package struct {
	Name   string          `json:"name" validate:"required"`
	Config json.RawMessage `json:"config"`
}

type Config struct {
	OS         string     `json:"os" validate:"required"`
	SystemUser SystemUser `json:"system_user" validate:"required"`
	Packages   []Package  `json:"packages" validate:"required,dive"`
}
