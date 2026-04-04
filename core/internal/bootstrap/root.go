package bootstrap

import (
	"fmt"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/commands"
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
	rootCmd.AddCommand(commands.SetupCmd())
	rootCmd.AddCommand(commands.UpdateCmd())
	rootCmd.AddCommand(commands.TaskCmd())
	rootCmd.AddCommand(commands.RepoSetupCmd())
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
