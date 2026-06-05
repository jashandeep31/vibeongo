package actions

import (
	"os"
	"os/exec"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func ExecuteFinalScript() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}
	//	script := `source /home/ubuntu/.bashrc
	//
	// # nvm
	// export NVM_DIR="/home/ubuntu/.nvm"
	// [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
	// node -v
	// npm -v
	//
	// `
	script := ""
	script += cfg.FinalScript
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
