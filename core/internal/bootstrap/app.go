package bootstrap

import (
	"fmt"
	"log"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/docker"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/opencode"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
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
	// if err := user.CreateUser(config.SystemUser); err != nil {
	// 	log.Fatalf("Failed to create user with error: %v", err)
	// }

	// running the configs
	for _, pkg := range config.Packages {
		switch pkg.Name {

		case "docker":
			fmt.Println("Setting up the docker")
			if err := docker.Installer(pkg, config.SystemUser); err != nil {
				log.Fatalf("docker install flow failed: %v", err)
			}
		case "opencode":
			fmt.Println("Setting up the opencode")
			if err := opencode.SetupOpenCode(pkg); err != nil {
				log.Fatalf("opencode installation failed: %v", err)
			}

		default:
			fmt.Printf("%s is missing\n", pkg.Name)
		}
	}

	// Source .bashrc so the new PATH takes effect
	fmt.Println("sourcing the bashrc")
	_, err = utils.RunCommand("bash", "-c", "source ~/.bashrc")
	if err != nil {
		log.Fatalf("opencode installation failed: %v", err)
	}
	// installing opencode
	// sending the terminal to ui
	// settings the cloudflare or use something diff to just make the ssl connections
	// setting up the nvim with the kickstart
}
