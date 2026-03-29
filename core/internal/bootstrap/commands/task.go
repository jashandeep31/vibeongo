package commands

import (
	"fmt"
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
		fmt.Println(taskFolder)
		cmd := exec.Command("bash", "-c", task.Task)
		cmd.Dir = taskFolder

		out, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("task failed: %w", err)
		}
		fmt.Println("Done with the task", string(out))
	}
	return nil
}
