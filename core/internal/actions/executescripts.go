package actions

import (
	"fmt"
	"os"
	"os/exec"
	"regexp"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func ExecuteIntialScript() error {
	cfg, err := config.LoadAndValidate("config.json")
	ProvisionOpenCode(cfg.OpenCode)
	if err != nil {
		return err
	}

	tempScriptFile, err := os.CreateTemp("", "temp.sh")
	if err != nil {
		return err
	}
	defer tempScriptFile.Close()
	defer os.Remove(tempScriptFile.Name())

	exec.Command("mkdir", "-p", "/home/ubuntu/code").Run()
	exec.Command("sudo", "chown", "-R", "ubuntu:ubuntu", "/home/ubuntu/code").Run()

	script := `
	echo "intial script is running"
	`
	script = script + cfg.InitialScript
	path := "/home/ubuntu/code"
	tempScriptFile.Write([]byte(script))

	cmd := utils.ExecCommand(utils.SudoShellScriptFile, tempScriptFile.Name())
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
	fmt.Println("final is working ")
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}

	re := regexp.MustCompile(`(?m)^---\s*$`)
	parts := re.Split(cfg.FinalScript, -1)

	ensureSession := exec.Command("tmux", "new-session", "-d", "-s", "dev")
	ensureSession.Run()

	for i, part := range parts {
		fmt.Println("Running the part")
		fmt.Println(part)
		tempScriptFile, err := os.CreateTemp("", "temp-*.sh")
		if err != nil {
			return err
		}

		if _, err := tempScriptFile.Write([]byte(part)); err != nil {
			tempScriptFile.Close()
			os.Remove(tempScriptFile.Name())
			return err
		}

		if err := tempScriptFile.Close(); err != nil {
			os.Remove(tempScriptFile.Name())
			return err
		}

		if err := os.Chmod(tempScriptFile.Name(), 0755); err != nil {
			os.Remove(tempScriptFile.Name())
			return err
		}
		cmd := exec.Command("tmux", "new-window", "-t", "dev", "-n", fmt.Sprintf("task-%d", i), "bash", tempScriptFile.Name())
		if err := cmd.Run(); err != nil {
			os.Remove(tempScriptFile.Name())
			return err
		}

		// os.Remove(tempScriptFile.Name())
		// deleting this causes the issue
		// defer tempScriptFile.Close()
		// defer os.Remove(tempScriptFile.Name())
	}

	return nil
	// tempScriptFile, err := os.CreateTemp("", "temp.sh")
	// if err != nil {
	// 	return err
	// }
	//
	// defer tempScriptFile.Close()
	// defer os.Remove(tempScriptFile.Name())
	//
	// script := `#!/usr/bin/env bash
	// source /home/ubuntu/.bashrc
	// `
	// script = script + cfg.FinalScript
	//
	// path := "/home/ubuntu/code"
	//
	// tempScriptFile.Write([]byte(script))
	// cmd := utils.ExecCommand(utils.SudoShellScriptFile, tempScriptFile.Name())
	// cmd.Dir = path
	// cmd.Stdin = os.Stdin
	// cmd.Stdout = os.Stdout
	// cmd.Stderr = os.Stderr
	//
	// err = cmd.Run()
	// if err != nil {
	// 	return err
	// }
	//
	// return nil
}
