package httpclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	BaseURL          string
	DisableRedirects bool
}

const defaultHTTPTimeout = 10 * time.Second

func (c *Client) httpClient() *http.Client {
	client := &http.Client{Timeout: defaultHTTPTimeout}
	if c.DisableRedirects {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	}
	return client
}

func (c *Client) Post(path string, payload any, headers map[string]string, out any) (*http.Response, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", c.BaseURL+path, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return resp, decodeAPIResponse(resp, out)
}

func (c *Client) Get(path string, headers map[string]string, out any) (*http.Response, error) {
	req, err := http.NewRequest("GET", c.BaseURL+path, nil)
	if err != nil {
		return nil, err
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	return resp, decodeAPIResponse(resp, out)
}

func decodeAPIResponse(resp *http.Response, out any) error {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("%s %s returned %d: %s", resp.Request.Method, resp.Request.URL.String(), resp.StatusCode, truncateResponseBody(body))
	}

	if len(bytes.TrimSpace(body)) == 0 || out == nil {
		return nil
	}

	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("failed to decode JSON response from %s %s: %w; body: %s", resp.Request.Method, resp.Request.URL.String(), err, truncateResponseBody(body))
	}

	return nil
}

func truncateResponseBody(body []byte) string {
	text := strings.TrimSpace(string(body))
	if text == "" {
		return "<empty response>"
	}
	if len(text) > 500 {
		return text[:500] + "..."
	}
	return text
}
