package mcp

import (
	"context"
	"fmt"
	"log"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type withConfigHandler[In any] func(ctx context.Context, req *mcp.CallToolRequest, input In, cfg config.Config) (
	*mcp.CallToolResult, any, error,
)

func withConfig[In any](h withConfigHandler[In]) mcp.ToolHandlerFor[In, any] {
	return func(ctx context.Context, req *mcp.CallToolRequest, input In) (
		*mcp.CallToolResult, any, error,
	) {
		cfg, err := config.LoadAndValidate()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to load config: %w", err)
		}
		return h(ctx, req, input, cfg)
	}
}

func MCPCommand() error {
	server := mcp.NewServer(&mcp.Implementation{
		Name: "vibeongo0-cre",
	}, nil)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "Sum of 2 number",
		Description: "return the sum of 2 numbers",
	}, sumOf2)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "raise-pr",
		Description: "Raise a pull request in a configured repository",
	}, withConfig(raisePR))

	mcp.AddTool(server, &mcp.Tool{
		Name:        "raise-issue",
		Description: "Raise an issue in a configured repository",
	}, withConfig(raiseIssue))

	// starting the server
	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		log.Fatal(err)
		return err
	}
	return nil
}
