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

func (c *APIClient) Post(path string, payload any, out any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	resp, err := http.Post(c.BaseURL+path, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()
	fmt.Println(resp)
	return json.NewDecoder(resp.Body).Decode(out)
}
