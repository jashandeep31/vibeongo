package commands

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"

	"github.com/spf13/cobra"
)

func UpdateCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "update",
		Short: "Update the software version",
		Long:  "Use for updating the binary and command should run with sudo",
		RunE: func(cmd *cobra.Command, args []string) error {
			return update()
		},
	}
}

func update() error {
	fmt.Println("Updating vibeongo...")
	fmt.Println("always run as sudo vibeongo update")

	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	fmt.Println("Binary path:", exePath)

	url := "https://l1.devsradar.com/vibeongo"
	tmpPath := exePath + ".new"

	// Download
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	out, err := os.Create(tmpPath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return err
	}

	// Make executable
	err = os.Chmod(tmpPath, 0755)
	if err != nil {
		return err
	}

	// 🔥 Replace old binary
	err = os.Rename(tmpPath, exePath)
	if err != nil {
		return fmt.Errorf("failed to replace binary: %w", err)
	}

	fmt.Println("Binary replaced successfully")

	// Restart service
	cmd := exec.Command("systemctl", "restart", "vibeongo")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}
