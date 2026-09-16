package mcp

import (
	"context"
	"fmt"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type inlineReviewCommentInput struct {
	Path string `json:"path"`
	Line int    `json:"line"`
	Side string `json:"side"`
	Body string `json:"body"`
}

type commentRepositoryItemInput struct {
	RepoName string                     `json:"reponame"`
	Type     string                     `json:"type"`
	Number   int                        `json:"number"`
	Action   string                     `json:"action"`
	Body     string                     `json:"body,omitempty"`
	CommitID string                     `json:"commit_id,omitempty"`
	Comments []inlineReviewCommentInput `json:"comments,omitempty"`
}

type commentResponse struct {
	ID        int64  `json:"id"`
	State     string `json:"state"`
	Body      string `json:"body"`
	HTMLURL   string `json:"html_url"`
	CommitID  string `json:"commit_id"`
	CreatedAt string `json:"created_at"`
}

func buildCommentRequest(repo config.GitRepoConfig, input commentRepositoryItemInput) (string, map[string]any, error) {
	if err := validateItemType(input.Type); err != nil {
		return "", nil, err
	}
	if input.Number < 1 {
		return "", nil, fmt.Errorf("number must be a positive integer")
	}

	validActions := map[string]bool{
		"comment":         true,
		"review":          true,
		"approve":         true,
		"request_changes": true,
	}
	if !validActions[input.Action] {
		return "", nil, fmt.Errorf(
			"action must be %q, %q, %q, or %q",
			"comment", "review", "approve", "request_changes",
		)
	}
	if input.Type == "issue" && input.Action != "comment" {
		return "", nil, fmt.Errorf("issues only support the comment action")
	}

	if input.Action == "comment" {
		if strings.TrimSpace(input.Body) == "" {
			return "", nil, fmt.Errorf("comment body is required")
		}
		if len(input.Comments) != 0 {
			return "", nil, fmt.Errorf("inline comments are only supported for pull request reviews")
		}
		path, err := repositoryItemsPath(repo, "issue")
		if err != nil {
			return "", nil, err
		}
		return fmt.Sprintf("%s/%d/comments", path, input.Number), map[string]any{
			"body": input.Body,
		}, nil
	}

	if input.Action == "request_changes" && strings.TrimSpace(input.Body) == "" {
		return "", nil, fmt.Errorf("review body is required when requesting changes")
	}
	if input.Action == "review" && strings.TrimSpace(input.Body) == "" && len(input.Comments) == 0 {
		return "", nil, fmt.Errorf("a review requires a body or at least one inline comment")
	}

	path, err := repositoryItemsPath(repo, "pr")
	if err != nil {
		return "", nil, err
	}
	payload := map[string]any{
		"body": input.Body,
	}
	if input.CommitID != "" {
		payload["commit_id"] = input.CommitID
	}

	switch input.Action {
	case "review":
		payload["event"] = "COMMENT"
	case "request_changes":
		payload["event"] = "REQUEST_CHANGES"
	case "approve":
		if repo.Type == config.GitRepoTypeGitHub {
			payload["event"] = "APPROVE"
		} else {
			payload["event"] = "APPROVED"
		}
	}

	if len(input.Comments) != 0 {
		comments := make([]map[string]any, 0, len(input.Comments))
		for i, comment := range input.Comments {
			if strings.TrimSpace(comment.Path) == "" {
				return "", nil, fmt.Errorf("inline comment %d path is required", i+1)
			}
			if comment.Line < 1 {
				return "", nil, fmt.Errorf("inline comment %d line must be positive", i+1)
			}
			side := strings.ToUpper(comment.Side)
			if side != "LEFT" && side != "RIGHT" {
				return "", nil, fmt.Errorf("inline comment %d side must be LEFT or RIGHT", i+1)
			}
			if strings.TrimSpace(comment.Body) == "" {
				return "", nil, fmt.Errorf("inline comment %d body is required", i+1)
			}

			providerComment := map[string]any{
				"path": comment.Path,
				"body": comment.Body,
			}
			if repo.Type == config.GitRepoTypeGitHub {
				providerComment["line"] = comment.Line
				providerComment["side"] = side
			} else if side == "RIGHT" {
				providerComment["new_position"] = comment.Line
			} else {
				providerComment["old_position"] = comment.Line
			}
			comments = append(comments, providerComment)
		}
		payload["comments"] = comments
	}

	return fmt.Sprintf("%s/%d/reviews", path, input.Number), payload, nil
}

func commentFallbackURL(repo config.GitRepoConfig, input commentRepositoryItemInput) string {
	itemType := "issue"
	if input.Type == "pr" {
		itemType = "pull request"
	}
	return createdItemURL(repo, itemType, input.Number, "")
}

func commentRepositoryItem(ctx context.Context, req *mcp.CallToolRequest, input commentRepositoryItemInput, cfg config.Config) (
	*mcp.CallToolResult, any, error,
) {
	repo, err := findConfiguredRepo(cfg, input.RepoName)
	if err != nil {
		return nil, nil, err
	}
	path, payload, err := buildCommentRequest(*repo, input)
	if err != nil {
		return nil, nil, err
	}
	apiClient, headers, err := repositoryAPI(*repo)
	if err != nil {
		return nil, nil, err
	}

	var created commentResponse
	response, err := apiClient.Post(path, payload, headers, &created)
	if err != nil {
		if response != nil && response.StatusCode == 404 {
			return nil, nil, fmt.Errorf("%s #%d not found in %q", input.Type, input.Number, repo.FullName)
		}
		return nil, nil, fmt.Errorf(
			"failed to perform %s on %s #%d in %q: %w",
			input.Action,
			input.Type,
			input.Number,
			repo.FullName,
			err,
		)
	}

	fullURL := created.HTMLURL
	if fullURL == "" {
		fullURL = commentFallbackURL(*repo, input)
	}
	return jsonToolResult(map[string]any{
		"repository": repo.FullName,
		"type":       input.Type,
		"number":     input.Number,
		"action":     input.Action,
		"result": map[string]any{
			"id":         created.ID,
			"state":      created.State,
			"body":       created.Body,
			"html_url":   fullURL,
			"commit_id":  created.CommitID,
			"created_at": created.CreatedAt,
		},
	})
}
