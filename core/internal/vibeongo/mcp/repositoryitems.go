package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/shared/httpclient"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type listRepositoryItemsInput struct {
	RepoName string `json:"reponame"`
	Type     string `json:"type"`
	State    string `json:"state,omitempty"`
	Page     int    `json:"page,omitempty"`
	Count    int    `json:"count,omitempty"`
}

type getRepositoryItemInput struct {
	RepoName string `json:"reponame"`
	Type     string `json:"type"`
	Number   int    `json:"number"`
}

type providerItemUser struct {
	Login     string `json:"login"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
}

type repositoryItemUser struct {
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

type repositoryItemLabel struct {
	ID    int    `json:"id,omitempty"`
	Name  string `json:"name,omitempty"`
	Color string `json:"color,omitempty"`
}

type repositoryItemRef struct {
	Ref string `json:"ref"`
	SHA string `json:"sha"`
}

type providerRepositoryItem struct {
	Number      int                   `json:"number"`
	Title       string                `json:"title"`
	State       string                `json:"state"`
	Body        *string               `json:"body"`
	HTMLURL     string                `json:"html_url"`
	User        *providerItemUser     `json:"user"`
	CreatedAt   string                `json:"created_at"`
	UpdatedAt   string                `json:"updated_at"`
	ClosedAt    *string               `json:"closed_at"`
	Merged      bool                  `json:"merged"`
	MergedAt    *string               `json:"merged_at"`
	Draft       bool                  `json:"draft"`
	Comments    int                   `json:"comments"`
	Labels      []repositoryItemLabel `json:"labels"`
	Head        *repositoryItemRef    `json:"head"`
	Base        *repositoryItemRef    `json:"base"`
	PullRequest json.RawMessage       `json:"pull_request"`
}

type repositoryItem struct {
	Number    int                   `json:"number"`
	Title     string                `json:"title"`
	State     string                `json:"state"`
	Body      *string               `json:"body"`
	HTMLURL   string                `json:"html_url"`
	User      *repositoryItemUser   `json:"user,omitempty"`
	CreatedAt string                `json:"created_at"`
	UpdatedAt string                `json:"updated_at"`
	ClosedAt  *string               `json:"closed_at"`
	Merged    *bool                 `json:"merged,omitempty"`
	MergedAt  *string               `json:"merged_at,omitempty"`
	Draft     *bool                 `json:"draft,omitempty"`
	Comments  *int                  `json:"comments,omitempty"`
	Labels    []repositoryItemLabel `json:"labels,omitempty"`
	Head      *repositoryItemRef    `json:"head,omitempty"`
	Base      *repositoryItemRef    `json:"base,omitempty"`
}

func findConfiguredRepo(cfg config.Config, repoName string) (*config.GitRepoConfig, error) {
	validRepos := make([]string, 0, len(cfg.Repos))
	for i := range cfg.Repos {
		repo := &cfg.Repos[i]
		validRepos = append(validRepos, repo.RepoName)
		if repo.RepoName == repoName {
			return repo, nil
		}
	}
	return nil, fmt.Errorf(
		"repo %q not found; available repos: %s",
		repoName,
		strings.Join(validRepos, ", "),
	)
}

func repositoryAPI(repo config.GitRepoConfig) (httpclient.Client, map[string]string, error) {
	switch repo.Type {
	case config.GitRepoTypeGitHub:
		return httpclient.Client{BaseURL: "https://api.github.com"}, map[string]string{
			"Accept":               "application/vnd.github+json",
			"Authorization":        "Bearer " + repo.AccessToken,
			"X-GitHub-Api-Version": "2026-03-10",
		}, nil
	case config.GitRepoTypeForgejo:
		return httpclient.Client{
			BaseURL: strings.TrimRight(repo.ProviderURL, "/") + "/api/v1",
		}, map[string]string{
			"Accept":        "application/json",
			"Authorization": "token " + repo.AccessToken,
		}, nil
	default:
		return httpclient.Client{}, nil, fmt.Errorf(
			"unsupported repository type %q for repo %q",
			repo.Type,
			repo.RepoName,
		)
	}
}

func repositoryItemsPath(repo config.GitRepoConfig, itemType string) (string, error) {
	parts := strings.Split(repo.FullName, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", fmt.Errorf("invalid repository full name %q", repo.FullName)
	}
	endpoint := "issues"
	if itemType == "pr" {
		endpoint = "pulls"
	}
	return "/repos/" + url.PathEscape(parts[0]) + "/" +
		url.PathEscape(parts[1]) + "/" + endpoint, nil
}

func normalizeRepositoryItem(item providerRepositoryItem, itemType string) repositoryItem {
	normalized := repositoryItem{
		Number:    item.Number,
		Title:     item.Title,
		State:     item.State,
		Body:      item.Body,
		HTMLURL:   item.HTMLURL,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
		ClosedAt:  item.ClosedAt,
	}
	if item.User != nil {
		login := item.User.Login
		if login == "" {
			login = item.User.Username
		}
		normalized.User = &repositoryItemUser{Login: login, AvatarURL: item.User.AvatarURL}
	}
	if itemType == "pr" {
		normalized.Merged = &item.Merged
		normalized.MergedAt = item.MergedAt
		normalized.Draft = &item.Draft
		normalized.Head = item.Head
		normalized.Base = item.Base
	} else {
		normalized.Comments = &item.Comments
		normalized.Labels = item.Labels
	}
	return normalized
}

func jsonToolResult(value any) (*mcp.CallToolResult, any, error) {
	encoded, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to encode MCP result: %w", err)
	}
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(encoded)}},
	}, nil, nil
}

func validateItemType(itemType string) error {
	if itemType != "pr" && itemType != "issue" {
		return fmt.Errorf("type must be either %q or %q", "pr", "issue")
	}
	return nil
}

func listRepositoryItems(ctx context.Context, req *mcp.CallToolRequest, input listRepositoryItemsInput, cfg config.Config) (
	*mcp.CallToolResult, any, error,
) {
	if err := validateItemType(input.Type); err != nil {
		return nil, nil, err
	}
	state := input.State
	if state == "" {
		state = "open"
	}
	if state != "open" && state != "closed" && state != "all" {
		return nil, nil, fmt.Errorf("state must be %q, %q, or %q", "open", "closed", "all")
	}
	page := input.Page
	if page == 0 {
		page = 1
	}
	if page < 1 {
		return nil, nil, fmt.Errorf("page must be a positive integer")
	}
	count := input.Count
	if count == 0 {
		count = 20
	}
	if count < 1 || count > 50 {
		return nil, nil, fmt.Errorf("count must be between 1 and 50")
	}

	repo, err := findConfiguredRepo(cfg, input.RepoName)
	if err != nil {
		return nil, nil, err
	}
	apiClient, headers, err := repositoryAPI(*repo)
	if err != nil {
		return nil, nil, err
	}
	path, err := repositoryItemsPath(*repo, input.Type)
	if err != nil {
		return nil, nil, err
	}
	query := url.Values{
		"page":  {fmt.Sprintf("%d", page)},
		"state": {state},
	}
	if repo.Type == config.GitRepoTypeGitHub {
		query.Set("per_page", fmt.Sprintf("%d", count))
	} else {
		query.Set("limit", fmt.Sprintf("%d", count))
	}

	var providerItems []providerRepositoryItem
	if _, err := apiClient.Get(path+"?"+query.Encode(), headers, &providerItems); err != nil {
		return nil, nil, fmt.Errorf("failed to list %ss for %q: %w", input.Type, repo.FullName, err)
	}

	items := make([]repositoryItem, 0, len(providerItems))
	for _, item := range providerItems {
		if input.Type == "issue" && len(item.PullRequest) != 0 && string(item.PullRequest) != "null" {
			continue
		}
		items = append(items, normalizeRepositoryItem(item, input.Type))
	}
	return jsonToolResult(map[string]any{
		"repository": repo.FullName,
		"type":       input.Type,
		"state":      state,
		"items":      items,
		"pagination": map[string]any{
			"page":     page,
			"count":    count,
			"has_more": len(providerItems) == count,
		},
	})
}

func getRepositoryItem(ctx context.Context, req *mcp.CallToolRequest, input getRepositoryItemInput, cfg config.Config) (
	*mcp.CallToolResult, any, error,
) {
	if err := validateItemType(input.Type); err != nil {
		return nil, nil, err
	}
	if input.Number < 1 {
		return nil, nil, fmt.Errorf("number must be a positive integer")
	}

	repo, err := findConfiguredRepo(cfg, input.RepoName)
	if err != nil {
		return nil, nil, err
	}
	apiClient, headers, err := repositoryAPI(*repo)
	if err != nil {
		return nil, nil, err
	}
	path, err := repositoryItemsPath(*repo, input.Type)
	if err != nil {
		return nil, nil, err
	}

	var providerItem providerRepositoryItem
	response, err := apiClient.Get(fmt.Sprintf("%s/%d", path, input.Number), headers, &providerItem)
	if err != nil {
		if response != nil && response.StatusCode == 404 {
			return nil, nil, fmt.Errorf("%s #%d not found in %q", input.Type, input.Number, repo.FullName)
		}
		return nil, nil, fmt.Errorf("failed to get %s #%d for %q: %w", input.Type, input.Number, repo.FullName, err)
	}
	if input.Type == "issue" && len(providerItem.PullRequest) != 0 && string(providerItem.PullRequest) != "null" {
		return nil, nil, fmt.Errorf("item #%d in %q is a pull request, not an issue", input.Number, repo.FullName)
	}

	return jsonToolResult(map[string]any{
		"repository": repo.FullName,
		"type":       input.Type,
		"item":       normalizeRepositoryItem(providerItem, input.Type),
	})
}
