package commands

import (
	"fmt"
	"os"
	"os/exec"
	"path"

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

	if cfg.Tasks == nil {
		return nil
	}

	for _, task := range cfg.Tasks {
		taskFolder := path.Join("/home/ubuntu/code")
		if (task.FolderName != "") && (task.FolderName != ".") {
			taskFolder = path.Join(taskFolder, task.FolderName)
		}
		opencodeCommand := fmt.Sprintf("opencode run \"%s\"", task.Task)
		env := os.Environ()
		env = append(env, "PATH=/home/ubuntu/.opencode/bin:/usr/local/bin:/usr/bin:/bin")
		env = append(env, "HOME=/home/ubuntu")
		cmd := exec.Command("bash", "-c", opencodeCommand)
		cmd.Dir = taskFolder
		cmd.Env = env
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Start(); err != nil {
			return fmt.Errorf("failed to start update command: %w", err)
		}
		if err := cmd.Wait(); err != nil {
			return fmt.Errorf("update command failed: %w", err)
		}
	}
	return nil
}
