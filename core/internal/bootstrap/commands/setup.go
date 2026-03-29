package commands

import (
	"fmt"

	"github.com/fatih/color"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/docker"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/gitrepos"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/nvim"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/opencode"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/provision/runtimes"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/scripts"
	"github.com/spf13/cobra"
)

func SetupCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "setup",
		Short: "Setup the system",
		Long:  "Setup the system from scratch",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runSetup()
		},
	}
}

func runSetup() error {
	fmt.Println("v0.0.5")
	fmt.Println("")
	color.Cyan("Welcome, We are setting the system up for you")
	color.Yellow("it may take a while")
	fmt.Println("")
	fmt.Println("")

	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return fmt.Errorf("config has error: %w", err)
	}

	runtimes.NodeJSSetup()
	//
	// gh.Setup()
	//
	gitrepos.Setup(cfg.Repos)
	if 1 == 1 {
		return nil
	}

	if cfg.Docker != nil {
		docker.Setup(cfg.Docker)
	}

	if cfg.OpenCode != nil {
		opencode.Setup(cfg.OpenCode)
	}

	if cfg.Nvim != nil {
		nvim.Setup(cfg.Nvim)
	}

	fmt.Println("writing the bash scripts")
	scripts.WriteScripts()

	return nil
}
