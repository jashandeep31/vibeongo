package actions

import (
	"fmt"
	"os"
	"path"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func ExecuteTasks(cfg config.Config) error {
	apiClient := utils.APIClient{BaseURL: cfg.ServerBaseUrl}
	if len(cfg.Tasks) == 0 {
		return nil
	}
	continueFlag := false

	codeFolderPath := "/home/ubuntu/code"
	// env := append(
	// 	os.Environ(),
	// 	"PATH=/home/ubuntu/.opencode/bin:/usr/local/bin:/usr/bin:/bin",
	// 	"HOME=/home/ubuntu",
	// )

	for _, task := range cfg.Tasks {
		if task.Done {
			continue
		}
		taskFolderPath := path.Join(codeFolderPath, task.FolderName)
		// asking to create a plan
		if err := ExecuteOpencodeTask(taskFolderPath, continueFlag, task); err != nil {
			return err
		}
		continueFlag = true

		var b any
		apiClient.Post("/api/v1/runtime/sessions/"+cfg.SessionId+"/tasks/"+task.ID, struct {
			Done bool `json:"done"`
		}{
			Done: true,
		},
			map[string]string{
				"Authorization": "Bearer " + cfg.Token,
			},
			&b)

	}
	return nil
}

func ExecuteOpencodeTask(dir string, continueFlag bool, task config.TaskConfig) error {
	singleLineString := task.Task
	singleLineString = strings.ReplaceAll(singleLineString, "\n", " ")

	cmdStr := ""
	if continueFlag {
		cmdStr = fmt.Sprintf(`opencode run --continue %s%s%s`, getOpenCodeModelFlag(task.Model), getOpenCodeAgentFlag(task.Agent), singleLineString)
	} else {
		cmdStr = fmt.Sprintf(`opencode run %s %s %s`, getOpenCodeModelFlag(task.Model), getOpenCodeAgentFlag(task.Agent), singleLineString)
	}
	cmd := utils.ExecCommand(utils.LoginBash, cmdStr)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to run opencode command: %w", err)
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
