package docker

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

type Container struct {
	Name           string `json:"name"`
	ComposeFileURL string `json:"compose_file_url"`
	Filename       string `json:"filename"`
}

type DockerContainersConfig struct {
	Containers []Container `json:"containers"`
}

// API response structs
type fileData struct {
	File string `json:"file"`
}

type aPIResponse struct {
	Message string   `json:"message"`
	Data    fileData `json:"data"`
}

// function to run the containers
func RunContainers(pkg config.Package) error {
	var cfg DockerContainersConfig
	if err := json.Unmarshal(pkg.Config, &cfg); err != nil {
		return err
	}

	for _, container := range cfg.Containers {
		// clone the docker compose script
		fmt.Println(container.ComposeFileURL)

		// Getting the response from api
		resp, err := http.Get("http://localhost:8000/postgres-docker-compose-file")
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		var apiResp aPIResponse

		// putting the values to the var
		err = json.NewDecoder(resp.Body).Decode(&apiResp)
		if err != nil {
			return err
		}

		// !!!! Why not folders  why? we are using direct files
		// Sometimes the program is failing in the dev mode to create the files inside the folders
		fileBytes := []byte(apiResp.Data.File)
		os.WriteFile(container.Filename, fileBytes, 0644)

		// execute the command to run the container
		if _, err := utils.RunCommand("docker", "compose", "-f", container.Filename, "up", "-d"); err != nil {
			return fmt.Errorf("failed to start container %s %w", container.Name, err)
		}

	}
	return nil
}
