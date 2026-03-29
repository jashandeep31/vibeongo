package gitrepos

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Setup(gitRepos []config.GitRepoConfig) {
	path := "/home/ubuntu/code"
	utils.RunCommand("mkdir", "-p", path)

	for _, repo := range gitRepos {
		fmt.Println("Cloning the repo", repo.URL)

		// Create the folder for the repo  example-> /home/ubuntu/code/my-repo
		projectFolderPath := filepath.Join(path, repo.FolderName)

		if err := os.MkdirAll(projectFolderPath, os.ModePerm); err != nil {
			fmt.Println("Failed to create the folder", projectFolderPath, err)
		}
		out, err := utils.RunCommand("whoami")
		if err != nil {
			fmt.Println("Failed to clone the repo", repo.URL, err)
		}
		fmt.Println(string(out))
		cmd := exec.Command("bash", "-c", fmt.Sprintf("git clone %s %s", repo.URL, projectFolderPath))
		cmd.Dir = projectFolderPath
		err = cmd.Run()
		if err != nil {
			fmt.Println("Failed to clone the repo", repo.URL, err)
		}

		script := repo.SetupScript
		if script != "" {
			cmd = exec.Command("bash", "-c", script)
			cmd.Dir = projectFolderPath
			out, err := cmd.CombinedOutput()
			if err != nil {
				fmt.Println("Failed to run the setup script", err)
			}
			fmt.Println(string(out))

		}
	}
}
