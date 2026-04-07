package commands

import (
	"fmt"
	"os"
	"os/exec"
	"path"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/spf13/cobra"
)

// Run the tasks using the opencode run command
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

	for i, task := range cfg.Tasks {
		taskFolder := path.Join("/home/ubuntu/code")
		if (task.FolderName != "") && (task.FolderName != ".") {
			taskFolder = path.Join(taskFolder, task.FolderName)
		}

		tmpFile, err := os.CreateTemp("", "vibeongo-task-*.txt")
		if err != nil {
			return fmt.Errorf("failed to create temp file: %w", err)
		}
		defer os.Remove(tmpFile.Name())

		if _, err := tmpFile.WriteString(task.Task); err != nil {
			return fmt.Errorf("failed to write task: %w", err)
		}
		tmpFile.Close()

		opencodeCommand := ""
		if i == 0 {
			opencodeCommand = fmt.Sprintf("opencode run \"$(cat %s)\"", tmpFile.Name())
		} else {
			opencodeCommand = fmt.Sprintf("opencode run --continue \"$(cat %s)\"", tmpFile.Name())
		}
		env := os.Environ()
		env = append(env, "PATH=/home/ubuntu/.opencode/bin:/usr/local/bin:/usr/bin:/bin")
		env = append(env, "HOME=/home/ubuntu")
		cmd := exec.Command("bash", "-c", opencodeCommand)
		cmd.Dir = taskFolder
		cmd.Env = env
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("update command failed: %w", err)
		}
	}
	return nil
}
