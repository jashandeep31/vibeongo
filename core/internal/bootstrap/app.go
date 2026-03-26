package bootstrap

import (
	"fmt"
	"log"

	"github.com/fatih/color"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/docker"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/gitrepos"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/opencode"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/scripts"
)

func Run() {
	fmt.Println("v0.0.5")
	fmt.Println("")
	color.Cyan("Welcome, We are setting the system up for you")
	color.Yellow("it may take a while")
	fmt.Println("")
	fmt.Println("")

	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		log.Fatalf("config has error %v", err)
	}

	gitrepos.Setup(cfg.Repos)

	if cfg.Docker != nil {
		docker.Setup(cfg.Docker)
	}

	if cfg.OpenCode != nil {
		opencode.Setup(cfg.OpenCode)
	}

	if cfg.Nvim != nil {
		// nvim.Setup(config.Nvim)
		// fmt.Println("nvim is not supported yet")
	}

	fmt.Println("writing the bash scripts")
	scripts.WriteScripts()
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
