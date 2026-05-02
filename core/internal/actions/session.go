package actions

import (
	"fmt"
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func UpdateSessionOverview(cfg config.Config, overview string) error {
	fmt.Println("Updating the overview of the project")
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}
	var b any
	headers := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + cfg.Token,
	}
	resp, err := apiClient.Post("/api/v1/runtime/sessions/"+cfg.SessionId+"/overview", struct {
		Overview string `json:"overview"`
	}{Overview: overview}, headers, &b)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("failed to update session: unexpected status code %d", resp.StatusCode)
	}
	return nil
}

func ResumeSession(cfg config.Config) error {
	fmt.Println("Resuming the session")
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}
	var b struct {
		data string
	}
	headers := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + cfg.Token,
	}
	resp, err := apiClient.Get("/api/v1/runtime/sessions/"+cfg.SessionId+"/overview", headers, &b)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to resume session: unexpected status code %d", resp.StatusCode)
	}

	return nil
}
