package commands

import (
	"fmt"
	"os/exec"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/spf13/cobra"
)

func TaskCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "task",
		Short: "Perform configured task",
		Long:  "Run the configured task through OpenCode",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runTask()
		},
	}
}

func runTask() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return fmt.Errorf("config has error: %w", err)
	}

	if cfg.Task == "" {
		fmt.Println("No task to perform")
		return nil
	}

	opencodeCommand := fmt.Sprintf("/home/ubuntu/.opencode/bin/opencode run %s", cfg.Task)
	cmd := exec.Command("bash", "-c", opencodeCommand)
	cmd.Dir = "/home/ubuntu/code"

	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("opencode task failed: %w", err)
	}

	fmt.Println("Done with the opencode task", string(out))
	fmt.Println("Done with the opencode task")

	return nil
}
