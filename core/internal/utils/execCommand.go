package utils

import (
	"os/exec"
)

type commandType string

const (
	SudoUbuntuInterativeShell commandType = "sudo_ubuntu"
	SudoUbuntuLoginShell      commandType = "sudo_login_ubuntu"
	SudoShellScriptFile       commandType = "sudo_shell_script"
)

func ExecCommand(t commandType, script string) *exec.Cmd {
	switch t {
	case SudoUbuntuInterativeShell:
		return exec.Command(
			"sudo",
			"-iu", "ubuntu",
			"bash", "-ic",
			script,
		)
	case SudoShellScriptFile:
		return exec.Command(
			"sudo",
			"-iu", "ubuntu",
			"bash", script,
		)
	case SudoUbuntuLoginShell:
		return exec.Command(
			"sudo",
			"-u", "ubuntu",
			"bash", "-lc",
			script,
		)
	default:
		return exec.Command(script)
	}
}
