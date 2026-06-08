package actions

import (
	"os"
	"os/exec"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func ExecuteIntialScript() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}
	script := cfg.InitialScript
	path := "/home/ubuntu/code"

	cmd := exec.Command("sudo", "-u", "ubuntu", "bash", "-l", "-c", script)
	cmd.Dir = path
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err = cmd.Run()
	if err != nil {
		return err
	}

	return nil
}

func ExecuteFinalScript() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}
	script := cfg.FinalScript
	path := "/home/ubuntu/code"

	cmd := exec.Command("sudo", "-u", "ubuntu", "bash", "-l", "-c", script)
	cmd.Dir = path
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err = cmd.Run()
	if err != nil {
		return err
	}

	return nil
}
