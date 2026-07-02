package actions

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
	"github.com/spf13/cobra"
)

func MarkTask(cmd *cobra.Command, args []string) error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	id := args[0]
	if id == "" {
		return fmt.Errorf("id is required")
	}

	var task *config.TaskConfig

	for _, i := range cfg.Tasks {
		if i.ID == id {
			task = &i
			break
		}
	}
	if task == nil {
		return fmt.Errorf("enter the valid id no task found")
	}

	var b any
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseURL}
	apiClient.Post("/api/v1/runtime/sessions/"+cfg.SessionID+"/tasks/"+id, struct {
		Done bool `json:"done"`
	}{
		Done: true,
	},
		map[string]string{
			"Authorization": "Bearer " + cfg.Token,
		},
		&b)

	return nil
}

func ExecuteTasks(cfg config.Config) error {
	fmt.Println("Working on tasks")
	utils.KilltmuxSession("tasks")
	// starting the tmux session
	err := utils.StartTmuxSession("tasks", "/home/ubuntu/code")
	if err != nil {
		return nil
	}

	var tmuxScript strings.Builder
	tmuxScript.WriteString("#!/usr/bin/env bash\n")
	tmuxScript.WriteString("source /home/ubuntu/.bashrc\n")
	tmuxScript.WriteString("export HOME=/home/ubuntu\n")
	tmuxScript.WriteString("export PATH=/home/ubuntu/.opencode/bin:/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH\n\n")
	usedFolderPaths := map[string]bool{}

	for _, task := range cfg.Tasks {
		singleLineString := strings.ReplaceAll(task.Task, "\n", " ")

		fmt.Fprintf(&tmuxScript, "cd /home/ubuntu/code/%s\n",
			task.FolderName)

		if usedFolderPaths[task.FolderName] {
			fmt.Fprintf(&tmuxScript, "opencode run --continue %s%s%s\n",
				getOpenCodeModelFlag(task.Model),
				getOpenCodeAgentFlag(task.Agent),
				strconv.Quote(singleLineString))
		} else {
			fmt.Fprintf(&tmuxScript, "opencode run %s%s%s\n",
				getOpenCodeModelFlag(task.Model),
				getOpenCodeAgentFlag(task.Agent),
				strconv.Quote(singleLineString))

			usedFolderPaths[task.FolderName] = true
		}

		tmuxScript.WriteString("\n")
		fmt.Fprintf(&tmuxScript, "vibeongo mark-task %s \n\n", task.ID)
	}

	if cfg.InstanceConfig.Terminate {
		fmt.Fprintf(&tmuxScript, "vibeongo terminate\n\n")
	}
	fmt.Println(tmuxScript.String())
	err = utils.RunScriptInTmuxSession("tasks", tmuxScript.String())
	if err != nil {
		return err
	}

	return nil
}

func getOpenCodeAgentFlag(agent string) string {
	fmt.Println(agent)
	if agent != "" {
		return fmt.Sprintf("--agent %s ", agent)
	}
	return ""
}

func getOpenCodeModelFlag(model string) string {
	fmt.Println(model)
	if model != "" {
		return fmt.Sprintf("--model %s ", model)
	}
	return ""
}
