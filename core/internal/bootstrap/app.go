package bootstrap

import (
	"fmt"
	"log"
	"os/exec"
	"sync"

	"github.com/fatih/color"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/docker"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/gitrepos"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/nvim"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/opencode"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/scripts"
)

func Run() {
	var wg sync.WaitGroup
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
		nvim.Setup(cfg.Nvim)
	}

	if cfg.Task != "" {
		wg.Add(1)
		go func() {
			sourceCmd := exec.Command("source", "/home/ubuntu/.bashrc")
			sourceCmd.Run()
			defer wg.Done()

			fmt.Println("Working on the opencode task")
			opencodeCommand := fmt.Sprintf("/home/ubuntu/.opencode/bin/opencode run %s", cfg.Task)
			cmd := exec.Command("bash", "-c", opencodeCommand)
			cmd.Dir = "/home/ubuntu/code"
			out, err := cmd.CombinedOutput()
			if err != nil {
				fmt.Println(err)
			}
			fmt.Println("Done with the opencode task", string(out))
			fmt.Println("Done with the opencode task")
		}()
	}
	wg.Wait()
	fmt.Println("writing the bash scripts")
	scripts.WriteScripts()
}
