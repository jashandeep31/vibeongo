package actions

import (
	"fmt"
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func TerminateInstance(cfg config.Config, force bool) error {
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}

	if cfg.InstanceConfig.Terminate || force {
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
	fmt.Println("Termination is disabled by the current config. Run `vibeongo terminate --force` to override.")
	return nil
}
