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
		fmt.Println("Cloning the repo", repo.FullName, projectFolderPath, repo.FolderName)

		utils.AppendToBashScript(&script, `mkdir -p `+projectFolderPath)
		utils.AppendToBashScript(&script, `cd `+projectFolderPath)

		utils.AppendToBashScript(&script, getGitRepoCloneCommand(repo)+" "+projectFolderPath)
	}
	return script
}

// getGitRepoCloneCommand

// Returns the command to clone the git repo with the access token if it is provided
func getGitRepoCloneCommand(repo config.GitRepoConfig) string {
	cmd := "git clone"
	if repo.AccessToken != "" {
		cmd += " " + "https://x-access-token:" + repo.AccessToken + "@github.com/" + repo.FullName + ".git"
		return cmd
	}
	cmd += " " + "https://github.com/" + repo.FullName + ".git"
	return cmd
}
