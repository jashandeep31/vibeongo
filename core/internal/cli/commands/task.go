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
		Use:   "run-tasks",
		Short: "Execute configured opencode tasks",
		Long:  "Reads the tasks from the configuration and executes them sequentially using the opencode CLI tool.",
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

	if len(cfg.Tasks) == 0 {
		return nil
	}

	codeFolderPath := "/home/ubuntu/code"

	env := append(os.Environ(),
		"PATH=/home/ubuntu/.opencode/bin:/usr/local/bin:/usr/bin:/bin",
		"HOME=/home/ubuntu",
	)

	for _, task := range cfg.Tasks {

		// asking to create a plan
		taskFolderpath := path.Join(codeFolderPath, task.FolderName)
		if err := runOpencodeTask(taskFolderpath, env, systemPrompt+task.Task, false); err != nil {
			return err
		}

		// Working on the plan file
		if err := runOpencodeTask(taskFolderpath, env, "check vibeongoplan.md and complete all the tasks. and the most imprtant theirs is not one ot tell you which is write path and how you can handle this so be a independent do all at your no questions asked", true); err != nil {
			return err
		}

		// check what is pending
		if err := runOpencodeTask(taskFolderpath, env, "Please confirm onces after checking vibengoplan.md if anyting is left please compelte it ", true); err != nil {
			return err
		}
	}

	return nil
}

func runOpencodeTask(dir string, env []string, content string, continueFlag bool) error {
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
	if continueFlag == true {
		cmdStr = fmt.Sprintf(`opencode run --continue "$(cat %s)"`, tmpFile.Name())
	} else {
		cmdStr = fmt.Sprintf(`opencode run "$(cat %s)"`, tmpFile.Name())
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

var systemPrompt = `
You are an expert plan maker and a senior software engineer.

Your task is to create a detailed execution plan in a file named plan.md.

File placement rules:
- You have to create hte file on your own vibengoplan.md
- The vibengoplan.md file must be created.
- Before the please add it to .gitignore file too

Planning expectations:
- Act like a senior developer who has just received this task.
- The plan must be deeply detailed, structured, and actionable.
- Break the work into clear steps, sub-steps, and logical phases.
- Do NOT implement or fix anything — only create the plan.

Mandatory instructions to include:
- Always mention using the command:
  vibeongo get-config
  to retrieve GitHub tokens and other required credentials before performing any GitHub-related actions.

If working on a GitHub Issue:
- Understand and analyze the issue.
- Reproduce the problem (if applicable).
- Identify the root cause.
- Plan the implementation steps.
- Plan testing and validation.
- Include a step to write a Draft Pull Request.

If working on a Pull Request (PR):
- Review the code changes thoroughly.
- Validate logic, structure, and best practices.
- Test the changes locally (if applicable).
- Identify improvements or issues.
- Include a step to write a proper review on the GitHub PR.

Output requirements:
- The output must be a complete plan.md content.
- It should be well-structured using markdown (headings, bullet points, sections).
- It should reflect real-world engineering workflows and thinking.
`
