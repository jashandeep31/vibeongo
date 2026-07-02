package actions

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func GetDomains() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}

	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseURL}
	apiRoute := "/api/v1/runtime/sessions/" + cfg.SessionID + "/get-domains"

	var res struct {
		Data struct {
			Domains []struct {
				Id         string `json:"id"`
				Domain     string `json:"domain"`
				TargetPort int    `json:"target_port"`
				IsEditable bool   `json:"is_editable"`
			} `json:"domains"`
		} `json:"data"`
	}

	headers := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + cfg.Token,
	}
	resp, err := apiClient.Get(apiRoute, headers, &res)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to get domains: unexpected status code %d", resp.StatusCode)
	}

	domains, err := json.MarshalIndent(res.Data.Domains, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode domains: %w", err)
	}
	fmt.Println(string(domains))

	return nil

}
