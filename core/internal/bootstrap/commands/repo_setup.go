package commands

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/spf13/cobra"
)

func RepoSetupCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "repo_setup",
		Short: "Setup the repo",
		Long:  "Setup the repo from scratch",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runRepoSetup()
		},
	}
}

func runRepoSetup() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return fmt.Errorf("config has error: %w", err)
	}

	script := `source /home/ubuntu/.bashrc
# nvm
export NVM_DIR="/home/ubuntu/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
node -v 
npm -v
`
	path := "/home/ubuntu/code"

	for _, repo := range cfg.Repos {
		projectFolderPath := filepath.Join(path, repo.FolderName)
		repoSetupScript := repo.SetupScript
		if repoSetupScript != "" {
			utils.AppendToBashScript(&script, `cd `+projectFolderPath)
			utils.AppendToBashScript(&script, repoSetupScript)
		}
	}
	fmt.Println(script)
	cmd := exec.Command("sudo", "-u", "ubuntu", "bash", "-l", "-c", script)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	cmd.Run()

	if err != nil {
		fmt.Println("failed to run command: ", err)
	}
	return nil
}
