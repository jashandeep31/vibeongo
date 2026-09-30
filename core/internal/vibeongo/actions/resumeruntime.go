package actions

import (
	"encoding/json"
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/shared/httpclient"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
)

func ResumeRuntime(sessionToken string) error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	if sessionToken == "" {
		sessionToken = cfg.InstanceConfig.SessionToken
	}

	if err := refreshRuntimeConfig(cfg, sessionToken); err != nil {
		return err
	}
	cfg, err = config.LoadAndValidate()
	if err != nil {
		return fmt.Errorf("failed to load the refreshed config: %w", err)
	}

	if err := ProvisionFx(cfg.Fx); err != nil {
		return err
	}
	if err := ProvisionCodex(cfg.Codex); err != nil {
		return err
	}
	if err := ProvisionPi(cfg.Pi); err != nil {
		return err
	}
	if err := ProvisionVibeongoAIModels(cfg.VibeongoAIModels); err != nil {
		return err
	}
	if err := ProvisionOpenCode(cfg.OpenCode); err != nil {
		return err
	}

	opencode := store.NewOpencodeWeb()
	if !opencode.IsRunning() {
		if err := opencode.StartWebServerWithRetry(); err != nil {
			return fmt.Errorf("failed to start opencode: %w", err)
		}
	}

	return ExecuteDevScript()
}

func refreshRuntimeConfig(cfg config.Config, sessionToken string) error {
	apiClient := httpclient.Client{BaseURL: cfg.ServerBaseURL}
	headers := map[string]string{
		"Authorization": "Bearer " + sessionToken,
		"X-Instance-Id": cfg.InstanceID,
	}

	var response struct {
		Data json.RawMessage `json:"data"`
	}
	if _, err := apiClient.Get(
		"/api/v1/runtime/sessions/"+cfg.SessionID+"/config/"+cfg.InstanceID,
		headers,
		&response,
	); err != nil {
		return fmt.Errorf("failed to fetch the runtime config: %w", err)
	}
	if len(response.Data) == 0 || string(response.Data) == "null" {
		return fmt.Errorf("the runtime config response has no data")
	}

	if err := config.ReplaceConfigFile(response.Data); err != nil {
		return fmt.Errorf("failed to save the runtime config: %w", err)
	}
	fmt.Println("refreshed the runtime config")
	return nil
}
