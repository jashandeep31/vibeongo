package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type APIClient struct {
	BaseURL string
}

func (c *APIClient) Post(path string, payload any, out any) (*http.Response, error) {
	body, err := json.Marshal(payload)
	fmt.Println("making the request", c.BaseURL+path)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	resp, err := http.Post(c.BaseURL+path, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()
	return resp, json.NewDecoder(resp.Body).Decode(out)
}
