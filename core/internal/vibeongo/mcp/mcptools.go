package mcp

import (
	"context"
	"strconv"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type raisePRInput struct {
	RepoName string `json:"reponame"`
	Title    string `json:"title"`
	Body     string `json:"body"`
	Head     string `json:"head"`
	Base     string `json:"base"`
}

func raisePR(ctx context.Context, req *mcp.CallToolRequest, input raisePRInput) (
	*mcp.CallToolResult, any, error,
) {

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
