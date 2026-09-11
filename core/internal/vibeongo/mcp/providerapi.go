package mcp

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/shared/httpclient"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type providerAPIGetInput struct {
	RepoName string `json:"reponame"`
	URL      string `json:"url"`
}

type providerAPIPostInput struct {
	RepoName string         `json:"reponame"`
	URL      string         `json:"url"`
	Body     map[string]any `json:"body,omitempty"`
}

func validatedProviderAPIURL(repo config.GitRepoConfig, rawURL string) (*url.URL, error) {
	if strings.TrimSpace(rawURL) == "" {
		return nil, fmt.Errorf("API URL is required")
	}

	apiClient, _, err := repositoryAPI(repo)
	if err != nil {
		return nil, err
	}
	allowedBase, err := url.Parse(apiClient.BaseURL)
	if err != nil {
		return nil, fmt.Errorf("invalid configured provider API URL: %w", err)
	}
	target, err := url.ParseRequestURI(rawURL)
	if err != nil || !target.IsAbs() {
		return nil, fmt.Errorf("invalid absolute API URL %q", rawURL)
	}
	if target.User != nil {
		return nil, fmt.Errorf("API URL must not contain credentials")
	}
	if target.Fragment != "" {
		return nil, fmt.Errorf("API URL must not contain a fragment")
	}
	if !strings.EqualFold(target.Scheme, allowedBase.Scheme) ||
		!strings.EqualFold(target.Host, allowedBase.Host) {
		return nil, fmt.Errorf("API URL must use the configured provider API origin %s://%s", allowedBase.Scheme, allowedBase.Host)
	}

	fullNameParts := strings.Split(repo.FullName, "/")
	if len(fullNameParts) != 2 || fullNameParts[0] == "" || fullNameParts[1] == "" {
		return nil, fmt.Errorf("invalid repository full name %q", repo.FullName)
	}
	decodedPath, err := url.PathUnescape(target.EscapedPath())
	if err != nil {
		return nil, fmt.Errorf("invalid API URL path: %w", err)
	}
	if strings.Contains(decodedPath, "\\") || path.Clean(decodedPath) != decodedPath {
		return nil, fmt.Errorf("API URL path must not contain traversal or non-canonical segments")
	}
	expectedPrefix := strings.TrimRight(allowedBase.Path, "/") + "/repos/" +
		fullNameParts[0] + "/" + fullNameParts[1]
	if decodedPath != expectedPrefix && !strings.HasPrefix(decodedPath, expectedPrefix+"/") {
		return nil, fmt.Errorf("API URL must target configured repository %q", repo.FullName)
	}
	return target, nil
}

func executeProviderAPIRequest(repo config.GitRepoConfig, method string, rawURL string, body map[string]any) (
	*mcp.CallToolResult, any, error,
) {
	target, err := validatedProviderAPIURL(repo, rawURL)
	if err != nil {
		return nil, nil, err
	}
	_, headers, err := repositoryAPI(repo)
	if err != nil {
		return nil, nil, err
	}
	client := httpclient.Client{
		BaseURL:          target.Scheme + "://" + target.Host,
		DisableRedirects: true,
	}

	var data any
	var responseStatus int
	if method == "GET" {
		response, err := client.Get(target.RequestURI(), headers, &data)
		if err != nil {
			return nil, nil, fmt.Errorf("provider API GET failed for %q: %w", repo.FullName, err)
		}
		responseStatus = response.StatusCode
	} else {
		response, err := client.Post(target.RequestURI(), body, headers, &data)
		if err != nil {
			return nil, nil, fmt.Errorf("provider API POST failed for %q: %w", repo.FullName, err)
		}
		responseStatus = response.StatusCode
	}

	return jsonToolResult(map[string]any{
		"provider":   repo.Type,
		"repository": repo.FullName,
		"method":     method,
		"url":        target.String(),
		"status":     responseStatus,
		"data":       data,
	})
}

func providerAPIGet(ctx context.Context, req *mcp.CallToolRequest, input providerAPIGetInput, cfg config.Config) (
	*mcp.CallToolResult, any, error,
) {
	repo, err := findConfiguredRepo(cfg, input.RepoName)
	if err != nil {
		return nil, nil, err
	}
	return executeProviderAPIRequest(*repo, "GET", input.URL, nil)
}

func providerAPIPost(ctx context.Context, req *mcp.CallToolRequest, input providerAPIPostInput, cfg config.Config) (
	*mcp.CallToolResult, any, error,
) {
	repo, err := findConfiguredRepo(cfg, input.RepoName)
	if err != nil {
		return nil, nil, err
	}
	return executeProviderAPIRequest(*repo, "POST", input.URL, input.Body)
}
