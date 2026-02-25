package bootstrap

import (
	"fmt"
	"log"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/docker"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/user"
)

func Run() {
	const runScript = false
	// getting the config json file
	file, err := LoadConfig("config.json")
	if err != nil {
		log.Fatalf("application startup failed: %v", err)
	}

	// validated validatedConfig
	validatedConfig, err := ValidateConfig(file)
	if err != nil {
		log.Fatalf("config has error %v", err)
	}

	if runScript == true {
		// creating the user
		if err := user.CreateUser(validatedConfig.SystemUser); err != nil {
			log.Fatalf("Failed to create user with error: %v", err)
		}
		for _, pkg := range validatedConfig.Packages {
			switch pkg.Name {
			case "docker":
				// TODO: working with docker function
				if err := docker.Installer(pkg, validatedConfig.SystemUser); err != nil {
					log.Fatalf("docker install flow failed: %v", err)
				}
			default:
				fmt.Printf("%s is missing\n", pkg.Name)
			}
		}
	} else {

		//
		//
		// Testing purposes things only
		//
		//

		fmt.Println("Only testing script is working")
		for _, pkg := range validatedConfig.Packages {
			switch pkg.Name {
			case "docker":
				if err := docker.ScriptValidator(pkg); err != nil {
					log.Fatalf("docker validation failed: %v", err)
				}
			}
		}
		// docker.ScriptValidator()
	}
}
