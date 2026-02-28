package bootstrap

import (
	"fmt"
	"log"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/docker"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/user"
)

func Run() {
	file, err := LoadConfig("config.json")
	if err != nil {
		log.Fatalf("application startup failed: %v", err)
	}

	// getting config
	config, err := ValidateConfig(file)
	if err != nil {
		log.Fatalf("config has error %v", err)
	}

	// creating the user
	if err := user.CreateUser(config.SystemUser); err != nil {
		log.Fatalf("Failed to create user with error: %v", err)
	}

	// running the configs
	for _, pkg := range config.Packages {
		switch pkg.Name {

		case "docker":
			if err := docker.Installer(pkg, config.SystemUser); err != nil {
				log.Fatalf("docker install flow failed: %v", err)
			}

		default:
			fmt.Printf("%s is missing\n", pkg.Name)
		}
	}
}
