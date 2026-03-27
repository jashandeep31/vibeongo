package gitrepos

import (
	"fmt"
	"os/exec"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Setup(gitRepos []config.GitRepoConfig) {
	path := "/home/ubuntu/code"
	utils.RunCommand("mkdir", "-p", path)

	for _, repo := range gitRepos {
		fmt.Println("Working on the", repo.URL)
		cmd := exec.Command("git", "clone", repo.URL)
		cmd.Dir = path
		err := cmd.Run()
		if err != nil {
			fmt.Println("Failed to clone the repo", repo.URL)
		}
	}
}
