package actions

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func Renewkeys() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}

	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseURL}

	headers := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + cfg.Token,
	}

	type renewKeysResponse struct {
		Data struct {
			Repos []config.GitRepoConfig `json:"repos"`
		} `json:"data"`
	}

	var renewed renewKeysResponse
	_, err = apiClient.Get("/api/v1/runtime/sessions/"+cfg.SessionID+"/renew-tokens/"+cfg.InstanceID, headers, &renewed)
	if err != nil {
		return err
	}

	configPath, err := config.ResolveConfigPath()
	if err != nil {
		return err
	}

	configBytes, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	var configJSON map[string]any
	if err := json.Unmarshal(configBytes, &configJSON); err != nil {
		return fmt.Errorf("failed to parse config JSON: %w", err)
	}

	configJSON["repos"] = renewed.Data.Repos

	updatedConfig, err := json.MarshalIndent(configJSON, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode updated config: %w", err)
	}

	if err := os.WriteFile(configPath, append(updatedConfig, '\n'), 0o600); err != nil {
		return fmt.Errorf("failed to write updated config: %w", err)
	}

	fmt.Printf("Renewed %d repo credential(s) in %s\n", len(renewed.Data.Repos), configPath)
	return nil
}
