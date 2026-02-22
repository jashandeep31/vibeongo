package config

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
