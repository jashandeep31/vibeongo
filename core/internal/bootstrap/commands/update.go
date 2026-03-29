package commands

import (
	"bufio"
	"fmt"
	"os/exec"

	"github.com/spf13/cobra"
)

func UpdateCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "update",
		Short: "Update the system",
		Long:  "Run update scripts for the system",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runUpdate()
		},
	}
}

func runUpdate() error {
	fmt.Println("Updating the system")

	cmd := exec.Command("sudo", "bash", "-c", `/home/ubuntu/vibeongo/scripts/update.sh`)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to capture stdout: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to capture stderr: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start update command: %w", err)
	}

	stdoutScanner := bufio.NewScanner(stdout)
	for stdoutScanner.Scan() {
		fmt.Println(stdoutScanner.Text())
	}
	if err := stdoutScanner.Err(); err != nil {
		return fmt.Errorf("failed while reading stdout: %w", err)
	}

	stderrScanner := bufio.NewScanner(stderr)
	for stderrScanner.Scan() {
		fmt.Println(stderrScanner.Text())
	}
	if err := stderrScanner.Err(); err != nil {
		return fmt.Errorf("failed while reading stderr: %w", err)
	}

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("update command failed: %w", err)
	}

	return nil
}
