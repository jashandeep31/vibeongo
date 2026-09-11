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
		Name:        "raise-pr",
		Description: "Create a pull request in a configured GitHub or Forgejo repository. Provide the repository name, PR title and body, source branch in head, and destination branch in base. The tool uses the repository-scoped credential from the workspace configuration and returns the created pull request number and full web URL.",
	}, withConfig(raisePR))

	mcp.AddTool(server, &mcp.Tool{
		Name:        "raise-issue",
		Description: "Create an issue in a configured GitHub or Forgejo repository. Provide the repository name, a non-empty issue title, and an optional Markdown body. The tool uses the repository-scoped credential from the workspace configuration and returns the created issue number and full web URL.",
	}, withConfig(raiseIssue))

	mcp.AddTool(server, &mcp.Tool{
		Name:        "git-command",
		Description: "Run an allowed Git operation inside a configured workspace repository. Provide the repository name and Git arguments as an array, for example [\"status\", \"--short\"] or [\"push\", \"origin\", \"HEAD:feature-branch\"]. Supported operations are add, branch, checkout, commit, diff, fetch, log, pull, push, restore, show, status, and switch. For fetch, pull, and push, include the origin argument; the tool temporarily authenticates with the repository-scoped token, does not persist the credential, and redacts it from returned output.",
	}, withConfig(runGitCommand))

	// starting the server
	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		log.Fatal(err)
		return err
	}
	return nil
}
