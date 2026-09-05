package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/user"
	"path/filepath"
	"strings"

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

// Currently even serve the .hidden files and folders
// in future make it as per need

type FileListResponse struct {
	Path    string       `json:"path"`
	Entries []FileEntity `json:"entries"`
}

func GetListOfDirsAndFiles(c *echo.Context) error {
	requestPath := c.QueryParam("path")
	if requestPath == "" {
		requestPath = fmt.Sprintf("/home/%s/code", currentUser.Username)
	}

	entries, err := os.ReadDir(requestPath)
	if err != nil {
		return c.JSON(500, map[string]string{
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

	return c.JSON(200, FileListResponse{
		Path:    requestPath,
		Entries: files,
	})
}

func GetFileContent(c *echo.Context) error {
	requestFilepath := c.QueryParam("path")
	if requestFilepath == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "filepath is not valid")
	}

	filename := filepath.Base(requestFilepath)
	content, err := os.ReadFile(requestFilepath)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "file not found")
	}

	contentSample := content
	if len(contentSample) > 512 {
		contentSample = contentSample[:512]
	}
	contentType := http.DetectContentType(contentSample)

	return c.JSON(http.StatusOK, struct {
		Content     []byte `json:"content"`
		Name        string `json:"string"`
		ContentType string `json:"contentType"`
	}{
		Name:        filename,
		Content:     content,
		ContentType: contentType,
	})
}

func UploadFile(c *echo.Context) error {
	uploadToPath := c.FormValue("path")
	if uploadToPath == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "upload path is required")
	}

	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "File not found or not valid")
	}
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	dstPath := filepath.Join(uploadToPath, filepath.Base(file.Filename))
	dst, err := os.Create(dstPath)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, FileEntity{
		Name: file.Filename,
		Path: dstPath,
		Type: FileTypeFile,
	})
}

func DeleteFileOrFolder(c *echo.Context) error {
	pathToSource := filepath.Clean(c.QueryParam("path"))
	if pathToSource == "." {
		return echo.NewHTTPError(http.StatusBadRequest, "path cannot be empty")
	}
	if pathToSource == string(filepath.Separator) {
		return echo.NewHTTPError(http.StatusBadRequest, "filesystem root cannot be deleted")
	}

	info, err := os.Lstat(pathToSource)
	if os.IsNotExist(err) {
		return echo.NewHTTPError(http.StatusNotFound, "file or folder not found")
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if info.IsDir() {
		err = os.RemoveAll(pathToSource)
	} else {
		err = os.Remove(pathToSource)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, struct {
		Message string `json:"message"`
		Path    string `json:"path"`
	}{
		Message: "File or folder deleted",
		Path:    pathToSource,
	})
}

func CreateFileOrFolder(c *echo.Context) error {
	targetPath := strings.TrimSpace(c.FormValue("path"))
	if targetPath == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "path is required")
	}

	isFolder := strings.HasSuffix(targetPath, string(filepath.Separator))
	targetPath = filepath.Clean(targetPath)

	if _, err := os.Stat(targetPath); err == nil {
		return echo.NewHTTPError(http.StatusConflict, "file or folder already exists")
	} else if !os.IsNotExist(err) {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	if isFolder {
		if err := os.MkdirAll(targetPath, 0755); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}

		return c.JSON(http.StatusCreated, struct {
			Message string `json:"message"`
		}{
			Message: "Folder is created",
		})
	}

	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	file, err := os.Create(targetPath)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	if err := file.Close(); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, struct {
		Message string `json:"message"`
	}{
		Message: "File is created",
	})
}

func UpdateFileContent(c *echo.Context) error {
	content := c.FormValue("content")
	path := strings.TrimSpace(c.FormValue("path"))

	if path == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "path is required")
	}

	file, err := os.OpenFile(path, os.O_WRONLY|os.O_TRUNC, 0)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if _, err := file.WriteString(content); err != nil {
		file.Close()
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	if err := file.Close(); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, struct {
		Message string `json:"message"`
	}{
		Message: "Updated the file",
	})
}
