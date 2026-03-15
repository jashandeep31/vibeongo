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
			fmt.Println(string(pkg.Config))
		}
	}
	// TODO:  move all the validation to the config file here so no shit can happen on the go
	// TODO: use colors to print the validation and other messages

	return cfg, errors.New("this is custom generated error")
	// return cfg, nil
}
