package actions

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/jashandeep31/vibeongo/core/internal/config"
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
