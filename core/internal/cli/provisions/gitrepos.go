package provisions

import (
	"path/filepath"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

// Create a and return a script to clone the github repo on their respective paths
func SetupGitRepos(gitRepos []config.GitRepoConfig) string {
	script := ``
	path := "/home/ubuntu/code"
	utils.AppendToBashScript(&script, `mkdir -p `+path)

	for _, repo := range gitRepos {
		projectFolderPath := filepath.Join(path, repo.FolderName)

		utils.AppendToBashScript(&script, `mkdir -p `+projectFolderPath)
		utils.AppendToBashScript(&script, `cd `+projectFolderPath)
		utils.AppendToBashScript(&script, getGitRepoCloneCommand(repo)+" "+projectFolderPath)
	}

	return script
}

// Returns the command to clone the git repo with the access token if it is provided.
func getGitRepoCloneCommand(repo config.GitRepoConfig) string {
	cmd := "git clone"

	// Altough from the backend we forcing the tokens with every git repo but still to keep this func working without auth token we are writing this condition
	if repo.AccessToken != "" {
		cmd += " " + "https://x-access-token:" + repo.AccessToken + "@github.com/" + repo.FullName + ".git"
		return cmd
	}

	cmd += " " + "https://github.com/" + repo.FullName + ".git"
	return cmd
}
