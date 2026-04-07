package cli

import (
	"fmt"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/server"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "vibeongo",
	Short: "Bootstrap and maintenance commands",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Please use a subcommand like: setup, update, task")
	},
}

func init() {
	// rootCmd.AddCommand(commands.SetupCmd())
	// rootCmd.AddCommand(commands.UpdateCmd())
	// rootCmd.AddCommand(commands.TaskCmd())
	// rootCmd.AddCommand(commands.RepoSetupCmd())
	rootCmd.AddCommand(ServeCmd())
}

func ServeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start Server",
		Long:  "Start the server at the port 8080 ",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runRepoSetup()
		},
	}
}

func runRepoSetup() error {
	err := server.Start()
	fmt.Println(err)
	return err
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
