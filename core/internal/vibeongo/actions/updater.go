package actions

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

func SelfUpdate() error {
	fmt.Println("Updating vibeongo...")

	cfg, err := config.LoadAndValidate()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}
	if cfg.ServerBaseURL == "" {
		return fmt.Errorf("serverBaseUrl is missing from config")
	}

	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	fmt.Println("Binary path:", exePath)

	url := cfg.ServerBaseURL + "/vibeongo"
	if strings.Contains(cfg.ServerBaseURL, "vibeongo.com") {
		url = "https://download.vibeongo.com"
	}

	tmpPath := exePath + ".new"

	// Download
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// an error page must never replace the binary
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download from %s failed: %s", url, resp.Status)
	}

	out, err := os.Create(tmpPath)
	if err != nil {
		return err
	}

	_, err = io.Copy(out, resp.Body)
	if closeErr := out.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		os.Remove(tmpPath)
		return err
	}

	// Make executable
	err = os.Chmod(tmpPath, 0755)
	if err != nil {
		os.Remove(tmpPath)
		return err
	}

	// 🔥 Replace old binary
	err = os.Rename(tmpPath, exePath)
	if err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("failed to replace binary: %w", err)
	}

	fmt.Println("Binary replaced successfully")

	// Restart service: the service user has passwordless sudo, root needs no sudo
	cmd := exec.Command("sudo", "systemctl", "restart", "vibeongo")
	if os.Geteuid() == 0 {
		cmd = exec.Command("systemctl", "restart", "vibeongo")
	}
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("binary updated but restarting vibeongo failed: %w", err)
	}
	fmt.Println("vibeongo restarted")
	return nil
}
