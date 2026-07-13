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
		fmt.Println("Please use a subcommand like: setup-github-repos, run-repos-setup-script, tasks, serve")
	},
}

func init() {
	// UpdateCmd to update the vibeongo to the latest version
	rootCmd.AddCommand(UpdateCmd())
	// RenewKeysCmd Renew the expired keys from the config files
	rootCmd.AddCommand(RenewKeysCmd())
	// ProvissionToolsCmd setup all tools like: codex, t3Code and Opencode
	rootCmd.AddCommand(ProvissionToolsCmd())
	// CloneGitReposCmd clone the github repos
	rootCmd.AddCommand(CloneGitReposCmd())
	// ServeCmd start the echo server
	rootCmd.AddCommand(ServeCmd())
	// RepoSetupCmd Run the setup scripts of the github repos
	rootCmd.AddCommand(RepoSetupCmd())
	// TaskCmd Run the opencode in loop on the all tasks
	rootCmd.AddCommand(TaskCmd())
	//MarkTaskCmd mark the task as done by calling the backend api
	rootCmd.AddCommand(MarkTaskCmd())
	// GetKeysCmd List all the required secret keys for the ai
	rootCmd.AddCommand(GetKeysCmd())
	// terminate the instance
	rootCmd.AddCommand(TerminateInstanceCmd())
	// run the setup script
	rootCmd.AddCommand(ExecuteIntialScriptCmd())
	// running the final script
	rootCmd.AddCommand(ExecuteFinalScriptCmd())
	// running the dev script
	rootCmd.AddCommand(ExecuteDevScriptCmd())
	// View and manage the project config
	rootCmd.AddCommand(ConfigCmd())
	// print all the domains which point which port
	rootCmd.AddCommand(GetDomainCmd())

	// setting up hte session as per the overview file
	// rootCmd.AddCommand(InitializeSessionFromOverviewCmd())
	// Updating the overview
	// rootCmd.AddCommand(UpdateSessionFromOverviewCmd())
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
