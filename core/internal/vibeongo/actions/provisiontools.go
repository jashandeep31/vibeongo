package actions

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
)

func ProvisionCodex(cfg *config.CodexConfig) error {
	if cfg == nil {
		return nil
	}
	fmt.Println("setting up the codex auth.json")

	authJSON := cfg.AuthJSON

	authDir := "/home/ubuntu/.codex"
	if err := os.MkdirAll(authDir, 0o755); err != nil {
		return fmt.Errorf("failed to create opencode auth directory: %w", err)
	}

	authfilePath := filepath.Join(authDir, "auth.json")
	if err := os.WriteFile(authfilePath, authJSON, 0o600); err != nil {
		return fmt.Errorf("failed to write opencode auth.json: %w", err)
	}

	fmt.Println("updated the auth.json")
	return nil
}

func ProvisionPi(cfg *config.PiConfig) error {
	if cfg == nil {
		return nil
	}
	authJSON := cfg.AuthJSON
	authDir := "/home/ubuntu/.pi/agent"
	if err := os.MkdirAll(authDir, 0o755); err != nil {
		return fmt.Errorf("failed to create opencode auth directory: %w", err)
	}
	authfilePath := filepath.Join(authDir, "auth.json")
	if err := os.WriteFile(authfilePath, authJSON, 0o600); err != nil {
		return fmt.Errorf("failed to write opencode auth.json: %w", err)
	}

	fmt.Println("Pi agent setup is complete")
	return nil
}

func ProvisionT3Code(cfg config.Config) error {
	fmt.Println("Adding the projects to the t3")
	for _, repo := range cfg.Repos {
		projectFolderPath := filepath.Join("/home/ubuntu/code", repo.FolderName)
		if err := os.MkdirAll(projectFolderPath, 0o755); err != nil {
			return fmt.Errorf("failed to create project directory %q: %w", projectFolderPath, err)
		}

		cmd := utils.ExecCommand(utils.SudoUbuntuInterativeShell, "t3 project add "+projectFolderPath)
		output, err := cmd.Output()
		if err != nil {
			fmt.Println(err, "failed to add project to t3")
		}
		fmt.Println(string(output))
	}
	return nil
}

// Setup the opencode auth.json file
func ProvisionOpenCode(cfg *config.OpenCodeConfig) error {
	if cfg == nil {
		return nil
	}

	// opencode is pre-insatlled in the ami
	fmt.Println("opencode config is running ")
	authJSON := cfg.AuthJSON

	authDir := "/home/ubuntu/.local/share/opencode"
	if err := os.MkdirAll(authDir, 0o755); err != nil {
		return fmt.Errorf("failed to create opencode auth directory: %w", err)
	}

	authfilePath := filepath.Join(authDir, "auth.json")
	if err := os.WriteFile(authfilePath, authJSON, 0o600); err != nil {
		return fmt.Errorf("failed to write opencode auth.json: %w", err)
	}

	fmt.Println("updated the auth.json")
	return nil
}

func ProvisionDockerContainers(cfg *config.DockerConfig) error {
	if cfg == nil {
		return nil
	}

	fmt.Println("Setting up the docker containers")
	for _, container := range cfg.Containers {
		dir, err := os.MkdirTemp("", "compose-*")
		if err != nil {
			return err
		}
		defer os.RemoveAll(dir)
		composePath := filepath.Join(dir, "docker-compose.yml")

		if err := os.WriteFile(composePath, []byte(container.DockerComposeCode), 0o644); err != nil {
			return err
		}

		cmd := exec.Command("docker", "compose", "up", "-d")
		cmd.Dir = dir
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to start %q: %w", container.Name, err)
		}
	}

	return nil
}
