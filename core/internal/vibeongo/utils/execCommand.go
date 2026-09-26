package utils

import (
	"os/exec"
)

type commandType string

const (
	SudoInteractiveShell commandType = "sudo_interactive"
	SudoLoginShell       commandType = "sudo_login"
	SudoShellScriptFile  commandType = "sudo_shell_script"
)

func ExecCommand(t commandType, script string) *exec.Cmd {
	switch t {
	case SudoInteractiveShell:
		return exec.Command(
			"sudo",
			"-iu", CurrentUser.Username,
			"bash", "-ic",
			script,
		)
	case SudoShellScriptFile:
		return exec.Command(
			"sudo",
			"-iu", CurrentUser.Username,
			"bash", script,
		)
	case SudoLoginShell:
		return exec.Command(
			"sudo",
			"-u", CurrentUser.Username,
			"bash", "-lc",
			script,
		)
	default:
		return exec.Command(script)
	}
}
