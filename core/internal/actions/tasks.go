package actions

import (
	"fmt"
	"os"
	"os/exec"
	"path"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func ExecuteTasks(cfg config.Config) error {
	if len(cfg.Tasks) == 0 {
		return nil
	}
	continueFlag := false

	codeFolderPath := "/home/ubuntu/code"
	env := append(
		os.Environ(),
		"PATH=/home/ubuntu/.opencode/bin:/usr/local/bin:/usr/bin:/bin",
		"HOME=/home/ubuntu",
	)

	for _, task := range cfg.Tasks {
		taskFolderPath := path.Join(codeFolderPath, task.FolderName)
		// asking to create a plan
		if err := ExecuteOpencodeTask(taskFolderPath, env, continueFlag, task); err != nil {
			return err
		}
		continueFlag = true
	}

	return nil
}

func ExecuteOpencodeTask(dir string, env []string, continueFlag bool, task config.TaskConfig) error {
	cmdStr := ""
	if continueFlag {
		cmdStr = fmt.Sprintf(`opencode --continue run %s %s %s`, getOpenCodeModelFlag(task.Model), getOpenCodeAgentFlag(task.Agent), task.Task)
	} else {
		cmdStr = fmt.Sprintf(`opencode run %s %s %s`, getOpenCodeModelFlag(task.Model), getOpenCodeAgentFlag(task.Agent), task.Task)
	}
	cmd := exec.Command("bash", "-c", cmdStr)
	cmd.Dir = dir
	cmd.Env = env
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to run opencode command: %w", err)
	}

	return nil
}

func getOpenCodeAgentFlag(agent string) string {
	if agent != "" {
		return fmt.Sprintf("--agent %s", agent)
	}
	return ""
}

func getOpenCodeModelFlag(model string) string {
	if model != "" {
		return fmt.Sprintf("--model %s", model)
	}
	return ""
}
