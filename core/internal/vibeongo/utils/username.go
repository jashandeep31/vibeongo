package utils

import (
	"os/user"
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
