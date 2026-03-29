package runtimes

import "os/exec"

func NodeJSSetup() {
	script := `#!/usr/bin/env bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install 24
`

	cmd := exec.Command("bash", "-c", script)
	out, err := cmd.CombinedOutput()
	if err != nil {
		println("Failed to run the setup script", err)
	}
	println(string(out))
}
