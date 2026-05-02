package commands

import (
	"fmt"
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
	"github.com/spf13/cobra"
)

func TerminateInstanceCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "terminate",
		Short: "Terminate the instance",
		Long:  "Terminate the instance by calling the API",
		RunE: func(cmd *cobra.Command, args []string) error {
			return terminateInstance()
		},
	}
}

func terminateInstance() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}
	var apiRes any
	headers := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + cfg.Token,
	}
	resp, err := apiClient.Get("/api/v1/runtime/sessions/"+cfg.SessionId+"/terminate/"+cfg.InstanceId, headers, &apiRes)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to terminate instance: unexpected status code %d", resp.StatusCode)
	}

	return nil
}
