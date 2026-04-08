package cli

import (
	"fmt"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/cli/commands"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "vibeongo",
	Short: "Bootstrap and maintenance commands",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Please use a subcommand like: init-workspace, init-repos, run-tasks, serve")
	},
}

func init() {
	// rootCmd.AddCommand(commands.UpdateCmd())

	// setup the vps and config the things
	rootCmd.AddCommand(commands.VpsSetupCmd())
	// start the echo server
	rootCmd.AddCommand(commands.ServeCmd())
	// setup the repo like insatlling the dependencies
	rootCmd.AddCommand(commands.RepoSetupCmd())
	// run the tasks in the opencode
	rootCmd.AddCommand(commands.TaskCmd())
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
