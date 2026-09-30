package utils

import (
	"os"
	"os/user"
	"path/filepath"
	"strings"
)

var CurrentUser *user.User

func init() {
	var err error
	CurrentUser, err = currentUser()
	if err != nil {
		panic(err)
	}
}

// the user who ran the command: under sudo that is SUDO_USER, not root,
// so paths like /home/<user>/.config/vibeongo still point at their files
func currentUser() (*user.User, error) {
	if os.Geteuid() == 0 {
		if name := os.Getenv("SUDO_USER"); name != "" && name != "root" {
			if sudoUser, err := user.Lookup(name); err == nil {
				return sudoUser, nil
			}
		}
	}
	return user.Current()
}

func ReplaceUsernamePlaceholder(value string) string {
	return strings.ReplaceAll(value, "_USERNAME_", CurrentUser.Username)
}

func WorkspaceDirectory() string {
	return filepath.Join(CurrentUser.HomeDir, "workspace")
}
