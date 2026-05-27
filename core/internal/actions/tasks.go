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

	codeFolderPath := "/home/ubuntu/code"

	env := append(os.Environ(),
		"PATH=/home/ubuntu/.opencode/bin:/usr/local/bin:/usr/bin:/bin",
		"HOME=/home/ubuntu",
	)

	for _, task := range cfg.Tasks {
		taskFolderPath := path.Join(codeFolderPath, task.FolderName)

		fmt.Println("--------------------------------------------------")
		fmt.Println("Running task in:", taskFolderPath)
		fmt.Println("--------------------------------------------------")

		// asking to create a plan
		if err := ExecuteOpencodeTask(taskFolderPath, env, taskSystemPrompt+task.Task, false, cfg.OpenCode.Model); err != nil {
			return err
		}

		// Working on the plan file
		if err := ExecuteOpencodeTask(taskFolderPath, env, "check vibeongoplan.md and complete all the tasks. and the most imprtant theirs is not one ot tell you which is write path and how you can handle this so be a independent do all at your no questions asked", true, cfg.OpenCode.Model); err != nil {
			return err
		}

		// check what is pending
		if err := ExecuteOpencodeTask(taskFolderPath, env, "Please confirm onces after checking vibengoplan.md if anyting is left please compelte it ", true, cfg.OpenCode.Model); err != nil {
			return err
		}
	}

	return nil
}

func ExecuteOpencodeTask(dir string, env []string, content string, continueFlag bool, model string) error {
	tmpFile, err := os.CreateTemp("", "vibeongo-task-*.txt")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.WriteString(content); err != nil {
		tmpFile.Close()
		return fmt.Errorf("failed to write task: %w", err)
	}

	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("failed to close temp file: %w", err)
	}

	cmdStr := ""
	if continueFlag {
		if model == "default" || model == "" {
			cmdStr = fmt.Sprintf(`opencode run --continue "$(cat %s)"`, tmpFile.Name())
		} else {
			cmdStr = fmt.Sprintf(`opencode run --model %s --continue "$(cat %s)"`, model, tmpFile.Name())
		}
	} else {
		if model == "default" || model == "" {
			cmdStr = fmt.Sprintf(`opencode run "$(cat %s)"`, tmpFile.Name())
		} else {
			cmdStr = fmt.Sprintf(`opencode run --model %s "$(cat %s)"`, model, tmpFile.Name())
		}
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

var taskSystemPrompt = "You are an expert plan maker and a senior software engineer.\n" +
	"Your task is to create a detailed execution plan in a file named vibengoplan.md.\n\n" +
	"**File placement rules:**\n" +
	"- Create the file as `vibengoplan.md` in the repo root.\n" +
	"- Before creating it, add `vibengoplan.md` to `.gitignore`.\n\n" +
	"**Planning expectations:**\n" +
	"- Act like a senior developer who has just received this task.\n" +
	"- The plan must be deeply detailed, structured, and actionable.\n" +
	"- Break the work into clear steps, sub-steps, and logical phases.\n" +
	"- Do NOT implement or fix anything — only create the plan.\n\n" +
	"**Mandatory instructions to include:**\n" +
	"- Always mention using the command `vibeongo get-keys` to retrieve GitHub tokens and other required credentials before performing any GitHub-related actions.\n\n" +
	"**If working on a GitHub Issue:**\n" +
	"- Understand and analyze the issue.\n" +
	"- Reproduce the problem (if applicable).\n" +
	"- Identify the root cause.\n" +
	"- Plan the implementation steps.\n" +
	"- Plan testing and validation.\n" +
	"- Include a step to **open a Draft PR** (not a ready-for-review PR — just a draft to track progress).\n\n" +
	"**If working on a Pull Request (PR):**\n" +
	"- Review the code changes thoroughly.\n" +
	"- Validate logic, structure, and best practices.\n" +
	"- Test the changes locally (if applicable).\n" +
	"- Identify improvements or issues.\n" +
	"- Include a step to **post a review comment on the GitHub PR** (do not approve or merge).\n\n" +
	"**Output requirements:**\n" +
	"- The output must be complete `vibengoplan.md` content.\n" +
	"- Well-structured markdown (headings, bullets, sections).\n" +
	"- Reflects real-world engineering workflows."
