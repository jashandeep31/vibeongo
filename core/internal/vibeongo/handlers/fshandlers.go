package handlers

import (
	"context"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/git-pkgs/gitignore"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
	"github.com/labstack/echo/v5"
	"github.com/sahilm/fuzzy"
)

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
	Path      string       `json:"path"`
	Entries   []FileEntity `json:"entries"`
	Truncated bool         `json:"truncated,omitempty"`
}

func GetListOfDirsAndFiles(c *echo.Context) error {
	requestPath := c.QueryParam("path")
	if requestPath == "" {
		requestPath = utils.WorkspaceDirectory()
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
	info, err := os.Stat(requestFilepath)
	if err != nil || !info.Mode().IsRegular() {
		return echo.NewHTTPError(http.StatusBadRequest, "only regular files can be previewed")
	}
	file, err := os.Open(requestFilepath)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "file not found")
	}
	defer file.Close()
	// Sidebar previews are bounded; older clients keep the existing full-file API.
	var content []byte
	truncated := false
	if requestedLimit := c.QueryParam("maxBytes"); requestedLimit != "" {
		limit, parseErr := strconv.ParseInt(requestedLimit, 10, 64)
		if parseErr != nil || limit < 1 || limit > 1024*1024 {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid preview size")
		}
		content, err = io.ReadAll(io.LimitReader(file, limit+1))
		if int64(len(content)) > limit {
			content = content[:limit]
			truncated = true
		}
	} else {
		content, err = io.ReadAll(file)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "could not read file")
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
		Truncated   bool   `json:"truncated,omitempty"`
	}{
		Name:        filename,
		Content:     content,
		ContentType: contentType,
		Truncated:   truncated,
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
		basePath = utils.WorkspaceDirectory()
	}
	basePath = filepath.Clean(basePath)

	entries, truncated, err := searchFileEntries(c.Request().Context(), basePath, query)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, FileListResponse{
		Path:      basePath,
		Entries:   entries,
		Truncated: truncated,
	})
}

func searchFileEntries(ctx context.Context, basePath, query string) ([]FileEntity, bool, error) {
	paths, scanTruncated, err := collectFilePaths(ctx, basePath, 100_000)
	if err != nil {
		return nil, false, err
	}

	relativePaths := make([]string, 0, len(paths))
	for fullPath := range paths {
		if err := ctx.Err(); err != nil {
			return nil, false, err
		}
		relativePath, err := filepath.Rel(basePath, fullPath)
		if err != nil {
			return nil, false, err
		}
		relativePaths = append(relativePaths, filepath.ToSlash(relativePath))
	}
	// This makes results with equal fuzzy scores deterministic.
	sort.Strings(relativePaths)

	if err := ctx.Err(); err != nil {
		return nil, false, err
	}
	matches := fuzzy.Find(query, relativePaths)
	truncated := scanTruncated || len(matches) > 500
	if len(matches) > 500 {
		matches = matches[:500]
	}
	if err := ctx.Err(); err != nil {
		return nil, false, err
	}
	entries := make([]FileEntity, 0, len(matches))
	for _, match := range matches {
		fullPath := filepath.Join(basePath, filepath.FromSlash(match.Str))
		entries = append(entries, FileEntity{
			Name: paths[fullPath],
			Path: fullPath,
			Type: FileTypeFile,
		})
	}

	return entries, truncated, nil
}

func ProcessEachDir(dirPath string) (map[string]string, error) {
	files, _, err := collectFilePaths(context.Background(), dirPath, 0)
	return files, err
}

func collectFilePaths(ctx context.Context, dirPath string, limit int) (map[string]string, bool, error) {
	if err := ctx.Err(); err != nil {
		return nil, false, err
	}
	files := make(map[string]string)
	truncated := false
	visited := 0
	err := gitignore.Walk(dirPath, func(path string, entry fs.DirEntry) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if limit > 0 && visited >= limit {
			truncated = true
			return fs.SkipAll
		}
		visited++
		if entry.IsDir() {
			return nil
		}
		fullPath := filepath.Join(dirPath, filepath.FromSlash(path))
		files[fullPath] = entry.Name()
		return nil
	})
	if err != nil && !(truncated && err == fs.SkipAll) {
		return nil, false, err
	}
	return files, truncated, nil
}
