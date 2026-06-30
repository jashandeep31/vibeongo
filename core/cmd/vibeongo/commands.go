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
		Short: "Print workspace credentials and connection details",
		Long:  "Print the current workspace configuration summary, including tokens and repository credentials needed by local tools. Treat this output as sensitive.",
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

func RenewKeysCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "renew-keys",
		Short: "Renew the expired keys example: github token",
		Long:  "Renew the expired token and updates them in the config.json",
		RunE: func(cmd *cobra.Command, args []string) error {

			return actions.Renewkeys()
		},
	}
}

// InitializeSessionFromOverviewCmd gets the overview of the last session
func InitializeSessionFromOverviewCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "resume-session",
		Short: "Restore context from the saved project session",
		Long:  "Load the saved overview for the current project session so work can continue from the last recorded state.",
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
		Short: "Save a new overview for the current session",
		Long:  "Save the provided text as the latest overview for the current project session. Pass the overview directly after the command, for example: vibeongo update-session \"Implemented login flow\".",
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
		Use:   "run-repos-setup-script",
		Short: "Run setup steps for cloned repositories",
		Long:  "Run the configured setup commands for each cloned repository in the workspace, such as dependency installation or project-specific bootstrap scripts.",
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
		Short: "Start the local Vibeongo runtime server",
		Long:  "Start the local runtime server that handles workspace commands, terminal access, and runtime health checks.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return server.Start()
		},
	}
}

// TaskCmd executes configured opencode tasks
func TaskCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "tasks",
		Short: "Run configured session tasks",
		Long:  "Execute the tasks configured for the current session using the selected agent and model settings.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			return actions.ExecuteTasks(cfg)
		},
	}
}

func MarkTaskCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "mark-task",
		Short: "Makes the API call to mark the task done.Takes Task Id as parameter",
		Long:  "For internal use only try not to use this!! This allow a task to be marked as completed ones ai had gone through the task",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return actions.MarkTask(cmd, args)
		},
	}

}

// TerminateInstanceCmd terminates the instance
func TerminateInstanceCmd() *cobra.Command {
	var force bool
	cmd := &cobra.Command{
		Use:   "terminate",
		Short: "Terminate the current runtime instance",
		Long:  "Request termination of the current runtime instance. Use this when work is complete to release resources and stop further usage. Pass --force to terminate even when the current config disables automatic termination.",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			return actions.TerminateInstance(cfg, force)
		},
	}
	cmd.Flags().BoolVarP(&force, "force", "f", false, "Terminate even when the current config disables automatic termination")
	return cmd
}

// UpdateCmd updates the software version
func UpdateCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "update",
		Short: "Update the Vibeongo CLI",
		Long:  "Download and install the latest Vibeongo CLI binary for this environment.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return actions.SelfUpdate()
		},
	}
}

// VpsSetupCmd initializes the VPS environment and clones repositories
func VpsSetupCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "setup-github-repos",
		Short: "Prepare the workspace for the project",
		Long:  "Initialize the runtime workspace by applying authentication setup and cloning the repositories defined in the project configuration.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.LoadAndValidate("config.json")
			if err != nil {
				return err
			}
			return actions.InitializeWorkspace(cfg)
		},
	}
}

func ExecuteIntialScriptCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "setup",
		Short: "Run the project's initial setup script",
		Long:  "Execute the initial setup script configured for the project before starting normal work.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return actions.ExecuteSetupScript()
		},
	}
}

func ExecuteFinalScriptCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "final",
		Short: "Run the project's finalization script",
		Long:  "Execute the final script configured for the project, usually before ending or terminating the session.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return actions.ExecuteFinalScript()
		},
	}
}

func ExecuteDevScriptCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "dev",
		Short: "Run the project's dev script in tmux",
		Long:  "Execute the dev script configured for the project in a dev tmux session, usually for long-running development servers or watchers.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return actions.ExecuteDevScript()
		},
	}
}

func PrintConfigCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "config",
		Short: "Print the raw Vibeongo configuration",
		Long:  "Print the full raw configuration loaded by Vibeongo. This may include secrets, tokens, or credentials, so avoid sharing the output.",
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
