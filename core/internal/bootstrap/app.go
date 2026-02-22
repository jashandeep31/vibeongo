package bootstrap

import (
	"fmt"
	"log"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/docker"
)

func Run() {
	// getting the config json file
	file, err := LoadConfig("config.json")
	if err != nil {
		log.Fatalf("application startup failed: %v", err)
	}

	// validated validatedConfig
	validatedConfig, err := ValidateConfig(file)
	if err != nil {
		log.Fatalf("config is here")
	}

	for _, pkg := range validatedConfig.Packages {
		switch pkg.Name {
		case "docker":
			// TODO: working with docker function
			docker.Installer(pkg)
		default:
			fmt.Printf("%s is missing\n", pkg.Name)
		}
	}
}
