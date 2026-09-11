package mcp

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/shared/httpclient"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type raisePRInput struct {
	RepoName string `json:"reponame"`
	Title    string `json:"title"`
	Body     string `json:"body"`
	Head     string `json:"head"`
	Base     string `json:"base"`
}

type raiseIssueInput struct {
	RepoName string `json:"reponame"`
	Title    string `json:"title"`
	Body     string `json:"body"`
}

type createdItemResponse struct {
	Number  int    `json:"number"`
	Title   string `json:"title"`
	HTMLURL string `json:"html_url"`
}

func createdItemURL(repo config.GitRepoConfig, itemType string, number int, apiURL string) string {
	if apiURL != "" {
		return apiURL
	}

	baseURL := strings.TrimRight(repo.ProviderURL, "/") + "/" + strings.TrimLeft(repo.FullName, "/")
	if itemType == "pull request" {
		if repo.Type == config.GitRepoTypeGitHub {
			return fmt.Sprintf("%s/pull/%d", baseURL, number)
		}
		return fmt.Sprintf("%s/pulls/%d", baseURL, number)
	}
	return fmt.Sprintf("%s/issues/%d", baseURL, number)
}

func raisePR(ctx context.Context, req *mcp.CallToolRequest, input raisePRInput, cfg config.Config) (
	*mcp.CallToolResult, any, error,
) {

	validRepos := make([]string, 0, len(cfg.Repos))
	var repo *config.GitRepoConfig
	for _, r := range cfg.Repos {
		validRepos = append(validRepos, r.RepoName)
		if r.RepoName == input.RepoName {
			repo = &r
		}
	}

	if repo == nil {
		return nil, nil, fmt.Errorf(
			"repo %q not found; available repos: %s",
			input.RepoName,
			strings.Join(validRepos, ", "),
		)
	}

	switch repo.Type {
	case config.GitRepoTypeGitHub:
		return raiseGitHubPR(ctx, req, input, *repo)
	case config.GitRepoTypeForgejo:
		return raiseForgejoPR(ctx, req, input, *repo)
	default:
		return nil, nil, fmt.Errorf(
			"unsupported repository type %q for repo %q",
			repo.Type,
			input.RepoName,
		)
	}
}

func raiseGitHubPR(ctx context.Context, req *mcp.CallToolRequest, input raisePRInput, repo config.GitRepoConfig) (
	*mcp.CallToolResult, any, error,
) {
	if strings.TrimSpace(input.Title) == "" {
		return nil, nil, fmt.Errorf("pull request title is required")
	}
	if strings.TrimSpace(input.Head) == "" {
		return nil, nil, fmt.Errorf("pull request head branch is required")
	}
	if strings.TrimSpace(input.Base) == "" {
		return nil, nil, fmt.Errorf("pull request base branch is required")
	}

	fullNameParts := strings.Split(repo.FullName, "/")
	if len(fullNameParts) != 2 || fullNameParts[0] == "" || fullNameParts[1] == "" {
		return nil, nil, fmt.Errorf("invalid GitHub repository full name %q", repo.FullName)
	}

	apiClient := httpclient.Client{BaseURL: "https://api.github.com"}
	pullRequestPath := "/repos/" + url.PathEscape(fullNameParts[0]) + "/" +
		url.PathEscape(fullNameParts[1]) + "/pulls"
	payload := map[string]string{
		"title": input.Title,
		"body":  input.Body,
		"head":  input.Head,
		"base":  input.Base,
	}
	headers := map[string]string{
		"Accept":               "application/vnd.github+json",
		"Authorization":        "Bearer " + repo.AccessToken,
		"X-GitHub-Api-Version": "2026-03-10",
	}

	var created createdItemResponse
	if _, err := apiClient.Post(pullRequestPath, payload, headers, &created); err != nil {
		return nil, nil, fmt.Errorf("failed to create GitHub pull request for %q: %w", repo.FullName, err)
	}

	message := fmt.Sprintf(
		"Pull request #%d created in %s: %s",
		created.Number,
		repo.FullName,
		createdItemURL(repo, "pull request", created.Number, created.HTMLURL),
	)

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: message},
		},
	}, nil, nil
}

func raiseForgejoPR(ctx context.Context, req *mcp.CallToolRequest, input raisePRInput, repo config.GitRepoConfig) (
	*mcp.CallToolResult, any, error,
) {
	if strings.TrimSpace(input.Title) == "" {
		return nil, nil, fmt.Errorf("pull request title is required")
	}
	if strings.TrimSpace(input.Head) == "" {
		return nil, nil, fmt.Errorf("pull request head branch is required")
	}
	if strings.TrimSpace(input.Base) == "" {
		return nil, nil, fmt.Errorf("pull request base branch is required")
	}

	fullNameParts := strings.Split(repo.FullName, "/")
	if len(fullNameParts) != 2 || fullNameParts[0] == "" || fullNameParts[1] == "" {
		return nil, nil, fmt.Errorf("invalid Forgejo repository full name %q", repo.FullName)
	}

	apiClient := httpclient.Client{
		BaseURL: strings.TrimRight(repo.ProviderURL, "/") + "/api/v1",
	}
	pullRequestPath := "/repos/" + url.PathEscape(fullNameParts[0]) + "/" +
		url.PathEscape(fullNameParts[1]) + "/pulls"
	payload := map[string]string{
		"title": input.Title,
		"body":  input.Body,
		"head":  input.Head,
		"base":  input.Base,
	}
	headers := map[string]string{
		"Accept":        "application/json",
		"Authorization": "token " + repo.AccessToken,
	}

	var created createdItemResponse
	if _, err := apiClient.Post(pullRequestPath, payload, headers, &created); err != nil {
		return nil, nil, fmt.Errorf("failed to create Forgejo pull request for %q: %w", repo.FullName, err)
	}

	message := fmt.Sprintf(
		"Pull request #%d created in %s: %s",
		created.Number,
		repo.FullName,
		createdItemURL(repo, "pull request", created.Number, created.HTMLURL),
	)

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: message},
		},
	}, nil, nil
}

func raiseIssue(ctx context.Context, req *mcp.CallToolRequest, input raiseIssueInput, cfg config.Config) (
	*mcp.CallToolResult, any, error,
) {
	validRepos := make([]string, 0, len(cfg.Repos))
	var repo *config.GitRepoConfig
	for _, r := range cfg.Repos {
		validRepos = append(validRepos, r.RepoName)
		if r.RepoName == input.RepoName {
			repo = &r
		}
	}

	if repo == nil {
		return nil, nil, fmt.Errorf(
			"repo %q not found; available repos: %s",
			input.RepoName,
			strings.Join(validRepos, ", "),
		)
	}
	if strings.TrimSpace(input.Title) == "" {
		return nil, nil, fmt.Errorf("issue title is required")
	}

	fullNameParts := strings.Split(repo.FullName, "/")
	if len(fullNameParts) != 2 || fullNameParts[0] == "" || fullNameParts[1] == "" {
		return nil, nil, fmt.Errorf("invalid repository full name %q", repo.FullName)
	}

	issuePath := "/repos/" + url.PathEscape(fullNameParts[0]) + "/" +
		url.PathEscape(fullNameParts[1]) + "/issues"
	payload := map[string]string{
		"title": input.Title,
		"body":  input.Body,
	}

	var apiClient httpclient.Client
	var headers map[string]string
	switch repo.Type {
	case config.GitRepoTypeGitHub:
		apiClient.BaseURL = "https://api.github.com"
		headers = map[string]string{
			"Accept":               "application/vnd.github+json",
			"Authorization":        "Bearer " + repo.AccessToken,
			"X-GitHub-Api-Version": "2026-03-10",
		}
	case config.GitRepoTypeForgejo:
		apiClient.BaseURL = strings.TrimRight(repo.ProviderURL, "/") + "/api/v1"
		headers = map[string]string{
			"Accept":        "application/json",
			"Authorization": "token " + repo.AccessToken,
		}
	default:
		return nil, nil, fmt.Errorf(
			"unsupported repository type %q for repo %q",
			repo.Type,
			input.RepoName,
		)
	}

	var created createdItemResponse
	if _, err := apiClient.Post(issuePath, payload, headers, &created); err != nil {
		return nil, nil, fmt.Errorf("failed to create issue for %q: %w", repo.FullName, err)
	}

	message := fmt.Sprintf(
		"Issue #%d created in %s: %s",
		created.Number,
		repo.FullName,
		createdItemURL(*repo, "issue", created.Number, created.HTMLURL),
	)

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: message},
		},
	}, nil, nil
}

func sumOf2(ctx context.Context, req *mcp.CallToolRequest, input struct {
	Num1 int `json:"num1"`
	Num2 int `json:"num2"`
}) (
	*mcp.CallToolResult, any, error,
) {
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: strconv.Itoa(input.Num1 + input.Num2)},
		},
	}, nil, nil
}
