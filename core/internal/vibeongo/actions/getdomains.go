package actions

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/shared/httpclient"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

type RuntimeDomain struct {
	ID         string `json:"id"`
	Domain     string `json:"domain"`
	TargetPort int    `json:"target_port"`
	IsEditable bool   `json:"is_editable"`
}

func FetchDomains(cfg config.Config) ([]RuntimeDomain, error) {
	apiClient := httpclient.Client{BaseURL: cfg.ServerBaseURL}
	apiRoute := "/api/v1/runtime/sessions/" + cfg.SessionID + "/get-domains"

	var res struct {
		Data struct {
			Domains []RuntimeDomain `json:"domains"`
		} `json:"data"`
	}

	headers := runtimeAuthHeaders(cfg)
	resp, err := apiClient.Get(apiRoute, headers, &res)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get domains: unexpected status code %d", resp.StatusCode)
	}
	return res.Data.Domains, nil
}

func GetDomains() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	domainList, err := FetchDomains(cfg)
	if err != nil {
		return err
	}

	domains, err := json.MarshalIndent(domainList, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode domains: %w", err)
	}
	fmt.Println(string(domains))

	return nil

}
