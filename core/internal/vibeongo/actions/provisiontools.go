package actions

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
)

func ProvisionFx(cfg *config.FxConfig) error {
	if cfg == nil {
		return nil
	}
	fmt.Println("Setting up fx")
	authJSON := cfg.AuthJSON
	authDir := utils.ReplaceUsernamePlaceholder("/home/_USERNAME_/.fx")
	if err := os.MkdirAll(authDir, 0o755); err != nil {
		return fmt.Errorf("failed to create fx auth directory: %w", err)
	}
	authfilePath := filepath.Join(authDir, "auth.json")
	if err := os.WriteFile(authfilePath, authJSON, 0o600); err != nil {
		return fmt.Errorf("failed to write fx auth.json: %w", err)
	}
	fmt.Println("updated the auth.json")
	return nil
}

func ProvisionCodex(cfg *config.CodexConfig) error {
	if cfg == nil {
		return nil
	}
	fmt.Println("setting up the codex auth.json")

	authJSON := cfg.AuthJSON

	authDir := utils.ReplaceUsernamePlaceholder("/home/_USERNAME_/.codex")
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
	authDir := utils.ReplaceUsernamePlaceholder("/home/_USERNAME_/.pi/agent")
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

func ProvisionClaude(cfg *config.ClaudeConfig) error {
	if cfg == nil {
		return nil
	}
	fmt.Println("setting up the claude .credentials.json")

	credentialsJSON := bytes.TrimSpace(cfg.AuthJSON)
	if len(credentialsJSON) == 0 || string(credentialsJSON) == "null" {
		credentialsJSON = []byte("{}")
	}

	credentialsDir := utils.ReplaceUsernamePlaceholder("/home/_USERNAME_/.claude")
	if err := os.MkdirAll(credentialsDir, 0o755); err != nil {
		return fmt.Errorf("failed to create claude credentials directory: %w", err)
	}

	credentialsPath := filepath.Join(credentialsDir, ".credentials.json")
	if err := os.WriteFile(credentialsPath, credentialsJSON, 0o600); err != nil {
		return fmt.Errorf("failed to write claude .credentials.json: %w", err)
	}

	fmt.Println("updated the claude .credentials.json")
	return nil
}

func ProvisionT3Code(cfg config.Config) error {
	fmt.Println("Adding the projects to the t3")
	for _, repo := range cfg.Repos {
		projectFolderPath := filepath.Join(utils.WorkspaceDirectory(), repo.FolderName)
		if err := os.MkdirAll(projectFolderPath, 0o755); err != nil {
			return fmt.Errorf("failed to create project directory %q: %w", projectFolderPath, err)
		}

		cmd := utils.ExecCommand(utils.SudoInteractiveShell, "t3 project add "+projectFolderPath)
		output, err := cmd.Output()
		if err != nil {
			fmt.Println(err, "failed to add project to t3")
		}
		fmt.Println(string(output))
	}
	return nil
}

// ProvisionOpenCode imports the credentials (output of `opencode auth export`) with `opencode auth import`
func ProvisionOpenCode(cfg *config.OpenCodeConfig) error {
	if cfg == nil {
		return nil
	}

	authJSON := bytes.TrimSpace(cfg.AuthJSON)
	if len(authJSON) == 0 || string(authJSON) == "null" || string(authJSON) == "[]" {
		fmt.Println("no opencode credentials to import")
		return nil
	}

	// opencode is pre-insatlled in the ami. OPENCODE_BIN overrides it for local testing
	opencodeBin := os.Getenv("OPENCODE_BIN")
	if opencodeBin == "" {
		opencodeBin = utils.ReplaceUsernamePlaceholder("/home/_USERNAME_/.opencode/bin/opencode")
	}

	fmt.Println("importing opencode credentials")
	// --standalone avoids spawning the background service, credentials are passed on stdin so they never touch the disk
	cmd := exec.Command(opencodeBin, "auth", "import", "--standalone")
	cmd.Stdin = bytes.NewReader(authJSON)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to import opencode credentials: %w", err)
	}

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
