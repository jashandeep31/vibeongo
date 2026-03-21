package bootstrap

import (
	"fmt"
	"log"
	"os"

	"github.com/fatih/color"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/docker"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/gitrepos"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/opencode"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
)

func Run() {
	fmt.Println("v0.0.5")
	fmt.Println("")
	color.Cyan("Welcome, We are setting the system up for you")
	color.Yellow("it may take a while")
	fmt.Println("")
	fmt.Println("")

	file, err := loadConfig("config.json")
	if err != nil {
		log.Fatalf("application startup failed: %v", err)
	}

	config, err := utils.ValidateConfig(file)
	if err != nil {
		log.Fatalf("config has error %v", err)
	}

	gitrepos.Setup(config.Repos)

	if config.Docker != nil {
		docker.Setup(config.Docker)
	}

	if config.OpenCode != nil {
		opencode.Setup(config.OpenCode)
	}

	if config.Nvim != nil {
		// nvim.Setup(config.Nvim)
		// fmt.Println("nvim is not supported yet")
	}

	// Source .bashrc so the new PATH takes effect
	// fmt.Println("sourcing the bashrc")
	// _, err = utils.RunCommand("bash", "-c", "source ~/.bashrc")
	// if err != nil {
	// 	log.Fatalf("opencode installation failed: %v", err)
	// }
	//
	// fmt.Println("We suggest you to run `sudo reboot` it will update the user permissions.")
	// installing opencode
	// sending the terminal to ui
	// settings the cloudflare or use something diff to just make the ssl connections
	// setting up the nvim with the kickstart
}

func loadConfig(filename string) ([]byte, error) {
	file, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("Failed to load the config: %w", err)
	}
	return file, nil
}
