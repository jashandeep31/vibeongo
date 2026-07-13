package actions

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

type scripts struct {
	InitialScript string `json:"initialScript"`
	FinalScript   string `json:"finalScript"`
	DevScript     string `json:"devScript"`
}

type scriptsInput struct {
	InitialScript *string `json:"initialScript"`
	FinalScript   *string `json:"finalScript"`
	DevScript     *string `json:"devScript"`
}

func GetScripts() error {
	cnf, err := config.LoadAndValidate()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	resp := scripts{
		InitialScript: cnf.InitialScript,
		FinalScript:   cnf.FinalScript,
		DevScript:     cnf.DevScript,
	}

	data, err := json.MarshalIndent(resp, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode scripts: %w", err)
	}

	fmt.Println(string(data))
	return nil
}

func ModifyScripts(input string) error {
	var inputData scriptsInput

	if err := json.Unmarshal([]byte(input), &inputData); err != nil {
		return fmt.Errorf("failed to parse scripts JSON: %w", err)
	}
	if inputData.InitialScript == nil || inputData.FinalScript == nil || inputData.DevScript == nil {
		return fmt.Errorf("scripts JSON must include initialScript, finalScript, and devScript")
	}

	parsedData := scripts{
		InitialScript: *inputData.InitialScript,
		FinalScript:   *inputData.FinalScript,
		DevScript:     *inputData.DevScript,
	}

	configPath, err := config.ResolveConfigPath()
	if err != nil {
		return fmt.Errorf("failed to resolve config path: %w", err)
	}

	configData, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	var configJSON map[string]json.RawMessage
	if err := json.Unmarshal(configData, &configJSON); err != nil {
		return fmt.Errorf("failed to parse config: %w", err)
	}

	configJSON["initialScript"], _ = json.Marshal(parsedData.InitialScript)
	configJSON["finalScript"], _ = json.Marshal(parsedData.FinalScript)
	configJSON["devScript"], _ = json.Marshal(parsedData.DevScript)

	updatedConfig, err := json.MarshalIndent(configJSON, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode updated config: %w", err)
	}

	if err := os.WriteFile(configPath, append(updatedConfig, '\n'), 0o600); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	fmt.Printf("Updated scripts in %s\n", configPath)

	return nil
}

func UpdateScripts() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseURL}
	resp, err := apiClient.Post("/api/v1/runtime/sessions/", struct {
		InitialScript string                `json:"initialScript"`
		FinalScript   string                `json:"finalScript"`
		DevScript     string                `json:"devScript"`
		Config        config.InstanceConfig `json:"config"`
	}{
		InitialScript: cfg.InitialScript,
		FinalScript:   cfg.FinalScript,
		DevScript:     cfg.DevScript,
		Config:        cfg.InstanceConfig,
	}, runtimeAuthHeaders(cfg), nil)

	if err != nil {
		return fmt.Errorf("failed to update scripts: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to update scripts: unexpected status code %d", resp.StatusCode)
	}
	return nil

}
