package mcp

import (
	"context"
	"fmt"
	"strconv"
	"strings"

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

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: "PR is created"},
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
