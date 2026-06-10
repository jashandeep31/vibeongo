package actions

import (
	"fmt"
	"os"
	"os/exec"

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

	tempScriptFile, err := os.CreateTemp("", "temp.sh")
	if err != nil {
		return err
	}
	defer tempScriptFile.Close()
	defer os.Remove(tempScriptFile.Name())

	script := `#!/usr/bin/env bash
	source /home/ubuntu/.bashrc
	`
	script = script + cfg.FinalScript

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
