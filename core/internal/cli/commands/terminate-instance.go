package commands

import (
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func terminateInstance() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}
	var b any
	apiClient.Post("/api/v1/runtime/sessions/"+cfg.SessionId+"/terminate/"+cfg.ProjectId, nil, nil, &b)
	return nil
}
