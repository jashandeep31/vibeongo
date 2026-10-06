package actions

import (
	"bytes"
	"encoding/json"
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

func ProvisionVibeongoAIModels(models map[string]config.VibeongoAIModel) error {
	configPath := os.Getenv("OPENCODE_CONFIG")
	if configPath == "" {
		configPath = utils.ReplaceUsernamePlaceholder("/home/_USERNAME_/.config/opencode/opencode.json")
	}

	info, err := os.Stat(configPath)
	if err != nil {
		return fmt.Errorf("failed to find opencode config at %s: %w", configPath, err)
	}
	file, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read opencode config: %w", err)
	}

	var document map[string]json.RawMessage
	if err := json.Unmarshal(file, &document); err != nil {
		return fmt.Errorf("failed to parse opencode config: %w", err)
	}
	var providers map[string]json.RawMessage
	if err := json.Unmarshal(document["providers"], &providers); err != nil || providers == nil {
		return fmt.Errorf("opencode config has no providers")
	}
	var provider map[string]json.RawMessage
	if err := json.Unmarshal(providers["vibeongo_ai"], &provider); err != nil || provider == nil {
		return fmt.Errorf("opencode config has no vibeongo_ai provider")
	}

	if models == nil {
		models = map[string]config.VibeongoAIModel{}
	}
	if provider["models"], err = json.Marshal(models); err != nil {
		return fmt.Errorf("failed to encode vibeongo ai models: %w", err)
	}
	if providers["vibeongo_ai"], err = json.Marshal(provider); err != nil {
		return fmt.Errorf("failed to encode vibeongo_ai provider: %w", err)
	}
	if document["providers"], err = json.Marshal(providers); err != nil {
		return fmt.Errorf("failed to encode opencode providers: %w", err)
	}

	updated, err := json.MarshalIndent(document, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode opencode config: %w", err)
	}
	if err := os.WriteFile(configPath, append(updated, '\n'), info.Mode().Perm()); err != nil {
		return fmt.Errorf("failed to write opencode config: %w", err)
	}

	fmt.Printf("updated %d vibeongo ai models in the opencode config\n", len(models))
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
