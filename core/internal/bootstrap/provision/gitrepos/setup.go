package gitrepos

import (
	"fmt"
	"path/filepath"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Setup(gitRepos []config.GitRepoConfig) string {
	script := ``
	path := "/home/ubuntu/code"
	utils.AppendToBashScript(&script, `mkdir -p `+path)

	for _, repo := range gitRepos {
		projectFolderPath := filepath.Join(path, repo.FolderName)
		fmt.Println("Cloning the repo", repo.URL, projectFolderPath, repo.FolderName)

		utils.AppendToBashScript(&script, `mkdir -p `+projectFolderPath)
		utils.AppendToBashScript(&script, `cd `+projectFolderPath)
		utils.AppendToBashScript(&script, `git clone `+repo.URL+` `+projectFolderPath)

		if repo.SetupScript != "" {
			utils.AppendToBashScript(&script, `cd `+projectFolderPath)
			utils.AppendToBashScript(&script, `echo "running setup script"`)
			utils.AppendToBashScript(&script, repo.SetupScript)
		}

	}
	return script
}
