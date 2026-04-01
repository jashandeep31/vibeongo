package commands

import (
	"bufio"
	"fmt"
	"os/exec"

	"github.com/fatih/color"
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

	fmt.Println(cfg.Tasks)

	// gh.Setup()
	// NOTE: uses the older way
	// if cfg.Docker != nil {
	// 	docker.Setup(cfg.Docker)
	// }

	// if cfg.OpenCode != nil {
	// 	opencode.Setup(cfg.OpenCode)
	// }

	// if cfg.Nvim != nil {
	// 	nvim.Setup(cfg.Nvim)
	// }

	scripts.WriteScripts()

	script := `#!/usr/bin/env bash`

	// utils.AppendToBashScript(&script, runtimes.NodeJSSetup())
	// utils.AppendToBashScript(&script, gitrepos.Setup(cfg.Repos))

	cmd := exec.Command("bash", "-c", script)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to capture stdout: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to capture stderr: %w", err)
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start update command: %w", err)
	}
	stdoutScanner := bufio.NewScanner(stdout)

	for stdoutScanner.Scan() {
		fmt.Println(stdoutScanner.Text())
	}
	if err := stdoutScanner.Err(); err != nil {
		return fmt.Errorf("failed while reading stdout: %w", err)
	}

	stderrScanner := bufio.NewScanner(stderr)
	for stderrScanner.Scan() {
		fmt.Println(stderrScanner.Text())
	}
	if err := stderrScanner.Err(); err != nil {
		return fmt.Errorf("failed while reading stderr: %w", err)
	}

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("update command failed: %w", err)
	}
	fmt.Println("done")

	return nil
}
