package mcp

import (
	"context"
	"log"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func MCPCommand() error {
	server := mcp.NewServer(&mcp.Implementation{
		Name: "weather",
	}, nil)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "Sum of 2 number",
		Description: "return the sum of 2 numbers",
	}, sumOf2)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "raise-pr",
		Description: "Raise a PR ",
	}, raisePR)

	// starting the server
	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		log.Fatal(err)
		return err
	}
	return nil
}
