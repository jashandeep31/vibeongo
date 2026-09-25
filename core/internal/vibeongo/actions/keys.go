package actions

import (
	"encoding/json"
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/shared/httpclient"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

// RenewRepoCredentials fetches fresh repository credentials, persists them,
// and returns the reloaded workspace configuration without writing to stdout.
func RenewRepoCredentials() (config.Config, error) {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return config.Config{}, err
	}

	apiClient := httpclient.Client{BaseURL: cfg.ServerBaseURL}

	headers := runtimeAuthHeaders(cfg)

	type renewKeysResponse struct {
		Data struct {
			Repos []config.GitRepoConfig `json:"repos"`
		} `json:"data"`
	}

	var renewed renewKeysResponse
	_, err = apiClient.Get("/api/v1/runtime/sessions/"+cfg.SessionID+"/renew-tokens/"+cfg.InstanceID, headers, &renewed)
	if err != nil {
		return config.Config{}, err
	}

	if err := config.UpdateConfigFile(func(document map[string]json.RawMessage) error {
		repos, err := json.Marshal(renewed.Data.Repos)
		if err != nil {
			return fmt.Errorf("failed to encode renewed repositories: %w", err)
		}
		document["repos"] = repos
		return nil
	}); err != nil {
		return config.Config{}, err
	}

	refreshed, err := config.LoadAndValidate()
	if err != nil {
		return config.Config{}, fmt.Errorf("failed to reload renewed config: %w", err)
	}
	return refreshed, nil
}

func Renewkeys() error {
	refreshed, err := RenewRepoCredentials()
	if err != nil {
		return err
	}
	configPath, err := config.ResolveConfigPath()
	if err != nil {
		return err
	}

	fmt.Printf("Renewed %d repo credential(s) in %s\n", len(refreshed.Repos), configPath)
	return nil
}
