package commands

import (
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/server"
	"github.com/spf13/cobra"
)

// Start the echo server at the port 8080
func ServeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start Server",
		Long:  "Start the server at the port 8080 ",
		RunE: func(cmd *cobra.Command, args []string) error {
			return startServer()
		},
	}
}

func startServer() error {
	err := server.Start()
	fmt.Println(err)
	return err
}
