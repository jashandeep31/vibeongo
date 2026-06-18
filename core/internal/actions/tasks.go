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
	cfg, err := config.LoadAndValidate("config.json")
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
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}
	apiClient.Post("/api/v1/runtime/sessions/"+cfg.SessionId+"/tasks/"+id, struct {
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

	err = utils.RunScriptInTmuxSession("tasks", tmuxScript.String())
	if err != nil {
		return err
	}

	// apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}
	// if len(cfg.Tasks) == 0 {
	// 		return nil
	// 	}
	// 	continueFlag := false
	// 	codeFolderPath := "/home/ubuntu/code"
	// 	env := append(
	// 		os.Environ(),
	// 		"PATH=/home/ubuntu/.opencode/bin:/usr/local/bin:/usr/bin:/bin",
	// 		"HOME=/home/ubuntu",
	// 	)
	// 	// TODO: if we are chaning the folder the continue will not work so change the continue flag dynamically
	// 	for _, task := range cfg.Tasks {
	// 		if task.Done {
	// 			continue
	// 		}
	// 		taskFolderPath := path.Join(codeFolderPath, task.FolderName)
	// 		// asking to create a plan
	// 		if err := ExecuteOpencodeTask(taskFolderPath, env, continueFlag, task); err != nil {
	// 			return err
	// 		}
	// 		continueFlag = true
	// 		var b any
	// 		apiClient.Post("/api/v1/runtime/sessions/"+cfg.SessionId+"/tasks/"+task.ID, struct {
	// 			Done bool `json:"done"`
	// 		}{
	// 			Done: true,
	// 		},
	// 			map[string]string{
	// 				"Authorization": "Bearer " + cfg.Token,
	// 			},
	// 			&b)
	//
	// 	}
	// 	return nil
	// }
	//
	// func ExecuteOpencodeTask(dir string, env []string, continueFlag bool, task config.TaskConfig) error {
	// 	singleLineString := task.Task
	// 	singleLineString = strings.ReplaceAll(singleLineString, "\n", " ")
	//
	// 	cmdStr := ""
	// 	if continueFlag {
	// 		cmdStr = fmt.Sprintf(`opencode run --continue %s%s%s`, getOpenCodeModelFlag(task.Model), getOpenCodeAgentFlag(task.Agent), singleLineString)
	// 	} else {
	// 		cmdStr = fmt.Sprintf(`opencode run %s %s %s`, getOpenCodeModelFlag(task.Model), getOpenCodeAgentFlag(task.Agent), singleLineString)
	// 	}
	// 	// cmd := exec.Command("bash", "-c", cmdStr)
	// 	cmd := utils.ExecCommand(utils.SudoUbuntuInterativeShell, cmdStr)
	// 	cmd.Dir = dir
	// 	cmd.Env = env
	// 	cmd.Stdout = os.Stdout
	// 	cmd.Stderr = os.Stderr
	// 	if err := cmd.Run(); err != nil {
	// 		return fmt.Errorf("failed to run opencode command: %w", err)
	// 	}
	//
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
