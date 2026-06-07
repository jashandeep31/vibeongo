package main

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/actions"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/server"
	"github.com/spf13/cobra"
)

// GetKeysCmd gives token and other config related to workspace
func GetKeysCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get-keys",
		Short: "Display workspace configuration and authentication tokens",
		Long:  "Retrieve and display the current workspace configuration, including the API authentication token and repository-specific access tokens. Use this to manually authenticate Git or other services.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			fmt.Println(actions.FormatConfigSummary(cfg))
			return nil
		},
	}
}

// InitializeSessionFromOverviewCmd gets the overview of the last session
func InitializeSessionFromOverviewCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "resume-session",
		Short: "Fetch the overview and context of the last session",
		Long:  "Retrieves the status and context from the most recently suspended session. This includes details like the active branch, ongoing features, and current progress, allowing you to pick up exactly where you left off.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			return actions.ResumeSession(cfg)
		},
	}
}

// UpdateSessionFromOverviewCmd updates the overview of the current session
func UpdateSessionFromOverviewCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "update-session",
		Short: "Save the current session's progress and context, after commmand directly pass the overview like vibeongo update-session <overview>",
		Long: `Description:
Execute a command on the server using natural language. Just pass the overview directly after the command, and the system will automatically process the arguments and context.
Note: You only need to provide the task overview after the command. The backend automatically extracts and processes the required arguments from your input.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			overview := strings.Join(args, " ")
			return actions.UpdateSessionOverview(cfg, overview)
		},
	}
}

// RepoSetupCmd initializes and installs dependencies for repositories
func RepoSetupCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "init-repos",
		Short: "Install dependencies and run setup scripts for repositories",
		Long:  "Iterates through all cloned repositories in the workspace and executes their defined setup scripts. This typically involves installing dependencies (e.g., npm install) and performing initial build steps.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			return actions.InitializeRepositories(cfg)
		},
	}
}

// ServeCmd starts the echo server
func ServeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start the local background agent and API server",
		Long:  "Launches the Vibeongo agent server on port 8080. This server handles background tasks, terminal sessions (PTY), and health monitoring for the workspace.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return server.Start()
		},
	}
}

// TaskCmd executes configured opencode tasks
func TaskCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "run-tasks",
		Short: "Execute automated AI tasks using OpenCode",
		Long:  "Sequentially executes the AI-driven tasks defined in your configuration using the OpenCode tool. This includes generating execution plans, implementing changes, and verifying results autonomously.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			return actions.ExecuteTasks(cfg)
		},
	}
}

// TerminateInstanceCmd terminates the instance
func TerminateInstanceCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "terminate",
		Short: "Safely shut down and terminate the current instance",
		Long:  "Signals the orchestration layer to terminate the current runtime instance. Use this when you have finished your work to release resources and stop billing.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			return actions.TerminateInstance(cfg)
		},
	}
}

// UpdateCmd updates the software version
func UpdateCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "update",
		Short: "Update Vibeongo to the latest version",
		Long:  "Downloads the latest binary from the release server, replaces the current executable, and restarts the system service. This command must be run with sudo privileges.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return actions.SelfUpdate()
		},
	}
}

// VpsSetupCmd initializes the VPS environment and clones repositories
func VpsSetupCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "init-workspace",
		Short: "Bootstrap the VPS environment and clone project repositories",
		Long:  "Initializes a fresh VPS environment by configuring OpenCode authentication and cloning all Git repositories specified in the configuration into the workspace directory.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			return actions.InitializeWorkspace(cfg)
		},
	}
}

func ExecuteFinalScriptCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "start",
		Short: "Start the configured application",
		Long:  "Runs the configured final script and keeps the command attached until that script exits.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return actions.ExecuteFinalScript()
		},
	}
}

func PrintConfigCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "config",
		Short: "Print all the config used by vibeongo",
		Long:  "Print all the config used by vibeongo. Use with caution as it can reveal the secrets in the console",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			marshalCfg, _ := json.Marshal(cfg)
			fmt.Println(string(marshalCfg))
			return nil
		},
	}
}
