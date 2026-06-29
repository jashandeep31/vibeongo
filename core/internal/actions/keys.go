package actions

import (
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func Renewkeys() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}

	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseURL}

	var apiRes any
	headers := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + cfg.Token,
	}

	resp, err := apiClient.Get("/api/v1/runtime/sessions/"+cfg.SessionID+"/renew-kyes/"+cfg.InstanceID, headers, &apiRes)

	if err != nil {
		return err
	}
	fmt.Println(resp.StatusCode)
	fmt.Println(apiRes)
	return nil
}
