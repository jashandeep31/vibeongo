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

func (c *APIClient) Get(path string, headers map[string]string, out any) (*http.Response, error) {
	req, err := http.NewRequest("GET", c.BaseURL+path, nil)
	if err != nil {
		return nil, err
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	err = json.NewDecoder(resp.Body).Decode(out)
	return resp, err
}
