package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/actions"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type getRuntimeDomainsInput struct{}

func getRuntimeDomains(
	ctx context.Context,
	req *mcp.CallToolRequest,
	input getRuntimeDomainsInput,
	cfg config.Config,
) (*mcp.CallToolResult, any, error) {
	domains, err := actions.FetchDomains(cfg)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get runtime domains: %w", err)
	}

	result := struct {
		Domains []actions.RuntimeDomain `json:"domains"`
	}{Domains: domains}
	encoded, err := json.Marshal(result)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to encode runtime domains: %w", err)
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: string(encoded)},
		},
	}, result, nil
}
