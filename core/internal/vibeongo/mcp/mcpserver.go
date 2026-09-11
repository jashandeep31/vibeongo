package mcp

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/actions"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type withConfigHandler[In any] func(ctx context.Context, req *mcp.CallToolRequest, input In, cfg config.Config) (
	*mcp.CallToolResult, any, error,
)

func repositoryCredentialsNeedRenewal(cfg config.Config, now time.Time) bool {
	for _, repo := range cfg.Repos {
		if repo.Type != config.GitRepoTypeGitHub {
			continue
		}
		if repo.ExpiresAt == nil || !now.Before(*repo.ExpiresAt) {
			return true
		}
	}
	return false
}

func withConfig[In any](h withConfigHandler[In]) mcp.ToolHandlerFor[In, any] {
	return func(ctx context.Context, req *mcp.CallToolRequest, input In) (
		*mcp.CallToolResult, any, error,
	) {
		cfg, err := config.LoadAndValidate()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to load config: %w", err)
		}
		if repositoryCredentialsNeedRenewal(cfg, time.Now()) {
			cfg, err = actions.RenewRepoCredentials()
			if err != nil {
				return nil, nil, fmt.Errorf("failed to renew expired repository credentials: %w", err)
			}
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

	mcp.AddTool(server, &mcp.Tool{
		Name:        "list-repository-items",
		Description: "List either pull requests or issues from a configured GitHub or Forgejo repository. Provide reponame and type as pr or issue. Optionally set state to open, closed, or all, page to a positive page number, and count from 1 to 50. Defaults are open, page 1, and 20 results. Returns normalized JSON containing full web URLs and pagination metadata.",
	}, withConfig(listRepositoryItems))

	mcp.AddTool(server, &mcp.Tool{
		Name:        "get-repository-item",
		Description: "Get one pull request or issue from a configured GitHub or Forgejo repository. Provide reponame, type as pr or issue, and the positive PR or issue number. Returns normalized JSON with its title, body, state, full web URL, author, timestamps, and type-specific metadata.",
	}, withConfig(getRepositoryItem))

	mcp.AddTool(server, &mcp.Tool{
		Name:        "comment-repository-item",
		Description: "Comment on an issue or pull request, or submit a pull request review, in a configured GitHub or Forgejo repository. Provide reponame, type as pr or issue, number, and action as comment, review, approve, or request_changes. Timeline comments require a Markdown body. PR reviews may include commit_id and single-line inline comments with path, positive line, LEFT or RIGHT side, and Markdown body; suggestion code blocks are passed through unchanged. Review actions are not valid for issues. Returns normalized JSON with the full comment or review URL.",
	}, withConfig(commentRepositoryItem))

	mcp.AddTool(server, &mcp.Tool{
		Name:        "provider-api-get",
		Description: "Send an authenticated GET request to a GitHub or Forgejo API URL for a configured repository. Provide reponame and the complete API URL. The URL must use the repository's exact provider API origin and begin with its configured /repos/{owner}/{repo} path; credentials, fragments, traversal paths, other hosts, and other repositories are rejected. The tool attaches the repository-scoped token internally and returns normalized JSON containing status and response data.",
	}, withConfig(providerAPIGet))

	mcp.AddTool(server, &mcp.Tool{
		Name:        "provider-api-post",
		Description: "Send an authenticated JSON POST request to a GitHub or Forgejo API URL for a configured repository. Provide reponame, the complete API URL, and an optional JSON body. The URL must use the repository's exact provider API origin and begin with its configured /repos/{owner}/{repo} path; credentials, fragments, traversal paths, other hosts, and other repositories are rejected. The tool attaches the repository-scoped token internally, does not follow redirects, and returns normalized JSON containing status and response data. POST requests may change repository state, so use this tool only when the requested provider operation is intended.",
	}, withConfig(providerAPIPost))

	// starting the server
	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		log.Fatal(err)
		return err
	}
	return nil
}
