package utils

import (
	"os/exec"
)

type commandType string

const (
	SudoUbuntuUser commandType = "sudo_ubuntu"
)

func ExecCommand(t commandType, script string) *exec.Cmd {
	switch t {
	case SudoUbuntuUser:
		return exec.Command(
			"sudo",
			"-iu", "ubuntu",
			"bash", "-ic",
			script,
		)
	default:
		return exec.Command(script)
	}
}
