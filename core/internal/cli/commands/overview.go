package commands

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
	"github.com/spf13/cobra"
)

func InitializeSessionFromOverviewCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "resume-session",
		Short: "Get the overview of last session",
		Long:  "Fetch the details from the lastt suspended session like: branch working on. feature working  on and more",
		RunE: func(cmd *cobra.Command, args []string) error {
			return resumeSessionFromOverview()
		},
	}
}

func UpdateSessionFromOverviewCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "update-session",
		Short: "Update the overview of current session",
		Long:  "Update the details of the current session like: branch working on. feature working  on and more",
		RunE: func(cmd *cobra.Command, args []string) error {
			overview := strings.Join(args, " ")
			return updateSessionFromOverview(overview)
		},
	}
}

func updateSessionFromOverview(overview string) error {
	fmt.Println("Updating the overview of the project")
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}
	var b any
	headers := map[string]string{"Content-Type": "application/json", "Authorization": "Bearer " + cfg.Token}
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

func resumeSessionFromOverview() error {
	fmt.Println("Resuming the session")
	cfg, err := config.LoadAndValidate("config.json")
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}
	if err != nil {
		return err
	}
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
