package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "vibeongo",
	Short: "Bootstrap and maintenance commands",
	Run: func(cmd *cobra.Command, args []string) {
		version := "0.0.3"
		fmt.Println(version)
		fmt.Println("Please use a subcommand like: init-workspace, init-repos, run-tasks, serve")
	},
}

func init() {
	// update the vibeongo
	rootCmd.AddCommand(UpdateCmd())
	// setup the vps and config the things
	rootCmd.AddCommand(VpsSetupCmd())
	// start the echo server
	rootCmd.AddCommand(ServeCmd())
	// setup the repo like insatlling the dependencies
	rootCmd.AddCommand(RepoSetupCmd())
	// run the tasks in the opencode
	rootCmd.AddCommand(TaskCmd())
	// getting config
	rootCmd.AddCommand(GetconfigCmd())
	// setting up hte session as per the overview file
	rootCmd.AddCommand(InitializeSessionFromOverviewCmd())
	// Updating the overview
	rootCmd.AddCommand(UpdateSessionFromOverviewCmd())
	// terminate the instance
	rootCmd.AddCommand(TerminateInstanceCmd())
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
