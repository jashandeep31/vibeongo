package utils

import (
	"os/user"
	"path/filepath"
	"strings"
)

var CurrentUser *user.User

func init() {
	var err error
	CurrentUser, err = user.Current()
	if err != nil {
		panic(err)
	}
}

func ReplaceUsernamePlaceholder(value string) string {
	return strings.ReplaceAll(value, "_USERNAME_", CurrentUser.Username)
}

func WorkspaceDirectory() string {
	return filepath.Join(CurrentUser.HomeDir, "workspace")
}
