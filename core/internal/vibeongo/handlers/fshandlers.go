package handlers

import (
	"fmt"
	"net/http"
	"os"
	"os/user"
	"path/filepath"

	"github.com/labstack/echo/v5"
)

var currentUser *user.User

func init() {
	var err error

	currentUser, err = user.Current()
	if err != nil {
		panic(err)
	}
}

type FileType string

const (
	FileTypeFile FileType = "file"
	FileTypeDir  FileType = "directory"
)

type FileEntity struct {
	Name string   `json:"name"`
	Path string   `json:"path"`
	Type FileType `json:"type"`
}

type FileListResponse struct {
	Path    string       `json:"path"`
	Entries []FileEntity `json:"entries"`
}

func GetListOfDirsAndFiles(e *echo.Context) error {
	requestPath := e.QueryParam("path")
	if requestPath == "" {
		requestPath = fmt.Sprintf("/home/%s/code", currentUser.Username)
	}

	entries, err := os.ReadDir(requestPath)
	if err != nil {
		return e.JSON(500, map[string]string{
			"error": err.Error(),
		})
	}

	files := make([]FileEntity, 0, len(entries))

	for _, entry := range entries {
		fileType := FileTypeFile
		if entry.IsDir() {
			fileType = FileTypeDir
		}
		files = append(files, FileEntity{
			Name: entry.Name(),
			Path: filepath.Join(requestPath, entry.Name()),
			Type: fileType,
		})
	}

	return e.JSON(200, FileListResponse{
		Path:    requestPath,
		Entries: files,
	})
}

func GetFileContent(e *echo.Context) error {
	requestFilepath := e.QueryParam("path")
	if requestFilepath == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "filepath is not valid")
	}

	filebytes, err := os.ReadFile(requestFilepath)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "file not found")
	}

	return e.JSON(http.StatusOK, struct {
		Content []byte `json:"content"`
		Name    string `json:"string"`
	}{
		Name:    filepath.Base(requestFilepath),
		Content: filebytes,
	})

}
