package actions

import (
	"net/url"
	"path/filepath"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
)

// GenerateGitCloneScript returns a script that clones each configured Git repository.
func GenerateGitCloneScript(gitRepos []config.GitRepoConfig) string {
	script := ``
	path := "/home/ubuntu/code"

	for _, repo := range gitRepos {
		projectFolderPath := filepath.Join(path, repo.FolderName)

		utils.AppendToBashScript(&script, `mkdir -p `+shellQuote(projectFolderPath))
		utils.AppendToBashScript(&script, `cd `+shellQuote(projectFolderPath))
		utils.AppendToBashScript(&script, generateGitCloneCommand(repo)+" "+shellQuote(projectFolderPath))
	}

	return script
}

// gitCloneURL builds a repository clone URL from its provider base URL.
func gitCloneURL(repo config.GitRepoConfig) string {
	return strings.TrimRight(repo.ProviderURL, "/") + "/" +
		strings.TrimLeft(repo.FullName, "/") + ".git"
}

// generateGitCloneCommand adds the provider-specific username and access token
// to the clone URL derived from the provider URL and repository full name.
func generateGitCloneCommand(repo config.GitRepoConfig) string {
	cloneURL := gitCloneURL(repo)
	if repo.AccessToken != "" && repo.GitUsername != "" {
		if parsedURL, err := url.Parse(cloneURL); err == nil {
			parsedURL.User = url.UserPassword(repo.GitUsername, repo.AccessToken)
			cloneURL = parsedURL.String()
		}
	}

	return "git clone " + shellQuote(cloneURL)
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", `'"'"'`) + "'"
}
