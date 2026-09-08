package handlers

import (
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"os/user"
	"path/filepath"
	"sort"
	"strings"

	"github.com/git-pkgs/gitignore"
	"github.com/labstack/echo/v5"
	"github.com/sahilm/fuzzy"
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
	fileName := strings.TrimSpace(c.FormValue("fileName"))
	if fileName == "" {
		fileName = file.Filename
	}
	fileName = filepath.Base(fileName)
	if fileName == "." || fileName == ".." || fileName == string(filepath.Separator) {
		return echo.NewHTTPError(http.StatusBadRequest, "file name is not valid")
	}
	dstPath := filepath.Join(uploadToPath, fileName)
	dst, err := os.Create(dstPath)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, FileEntity{
		Name: fileName,
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

	if info, err := os.Stat(targetPath); err == nil {
		if info.IsDir() {
			return echo.NewHTTPError(http.StatusConflict, "directory already exists")
		}
		return echo.NewHTTPError(http.StatusConflict, "file already exists")
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

// SearchFiles searches file paths below the requested directory while
// respecting the gitignore files found in that directory tree.
func SearchFiles(c *echo.Context) error {
	query := strings.TrimSpace(c.QueryParam("query"))
	if query == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "search query is required")
	}

	basePath := strings.TrimSpace(c.QueryParam("path"))
	if basePath == "" {
		basePath = fmt.Sprintf("/home/%s/code", currentUser.Username)
	}
	basePath = filepath.Clean(basePath)

	entries, err := searchFileEntries(basePath, query)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, FileListResponse{
		Path:    basePath,
		Entries: entries,
	})
}

func searchFileEntries(basePath, query string) ([]FileEntity, error) {
	paths, err := ProcessEachDir(basePath)
	if err != nil {
		return nil, err
	}

	relativePaths := make([]string, 0, len(paths))
	for fullPath := range paths {
		relativePath, err := filepath.Rel(basePath, fullPath)
		if err != nil {
			return nil, err
		}
		relativePaths = append(relativePaths, filepath.ToSlash(relativePath))
	}
	// This makes results with equal fuzzy scores deterministic.
	sort.Strings(relativePaths)

	matches := fuzzy.Find(query, relativePaths)
	entries := make([]FileEntity, 0, len(matches))
	for _, match := range matches {
		fullPath := filepath.Join(basePath, filepath.FromSlash(match.Str))
		entries = append(entries, FileEntity{
			Name: paths[fullPath],
			Path: fullPath,
			Type: FileTypeFile,
		})
	}

	return entries, nil
}

func ProcessEachDir(dirPath string) (map[string]string, error) {
	files := make(map[string]string)
	err := gitignore.Walk(dirPath, func(path string, entry fs.DirEntry) error {
		if entry.IsDir() {
			return nil
		}
		fullPath := filepath.Join(dirPath, filepath.FromSlash(path))
		files[fullPath] = entry.Name()
		return nil
	})
	if err != nil {
		return nil, err
	}

	return files, nil
}
