package provisions

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

func SetupProjectFiles() error {
	apiClient := utils.APIClient{BaseURL: "https://server.vibeongo.com"}
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}

	var res struct {
		Files []struct {
			Id              string `json:"id"`
			Name            string `json:"name"`
			Path            string `json:"path"`
			ProjectFileData struct {
				Content string `json:"content"`
			} `json:"project_file_data"`
		} `json:"data"`
	}
	headers := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + cfg.Token,
	}
	resp, err := apiClient.Get(
		"/api/v1/runtime/sessions/"+cfg.SessionId+"/get-project-files",
		headers,
		&res,
	)
	if err != nil {
		log.Println(err)
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to get project files")
	}

	basePath := "/home/ubuntu/code"
	for _, file := range res.Files {
		fmt.Println("clonning", file.Name, "at", file.Path)
		dirPath := path.Join(basePath, file.Path)
		err := os.MkdirAll(dirPath, os.ModePerm)
		if err != nil {
			log.Println("mkdir error:", err)
			continue
		}
		fullFilePath := path.Join(dirPath, file.Name)
		err = os.WriteFile(
			fullFilePath,
			[]byte(file.ProjectFileData.Content),
			0644,
		)
		if err != nil {
			log.Println("write file error:", err)
			continue
		}
	}

	return nil
}
