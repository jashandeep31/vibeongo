package utils

import (
	"os/exec"
)

type commandType string

const (
	SudoUbuntuUser commandType = "sudo_ubuntu"
	LoginBash      commandType = "login_bash"
	SudoLoginBash  commandType = "sudo_login_bash"
)

func ExecCommand(t commandType, script string) *exec.Cmd {
	switch t {
	case SudoUbuntuUser:
		return exec.Command(
			"sudo",
			"-u", "ubuntu",
			"bash", "-l", "-c",
			script,
		)

	case LoginBash:
		return exec.Command(
			"bash",
			"-l", "-c",
			script,
		)

	case SudoLoginBash:
		return exec.Command(
			"sudo",
			"bash",
			"-l", "-c",
			script,
		)
	default:
		return exec.Command(script)
	}
}
