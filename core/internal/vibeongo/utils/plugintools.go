package utils

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// development keeps the token next to the running server, like config.json
func pluginTokenPath() string {
	if IsDevelopment() {
		return "webhook-token.txt"
	}
	return filepath.Join(ReplaceUsernamePlaceholder("/home/_USERNAME_/.config/vibeongo"), "webhook-token.txt")
}

// EnsurePluginTokenFile creates the opencode plugin webhook token file if it does not exist yet
func EnsurePluginTokenFile() error {
	path := pluginTokenPath()
	if _, err := os.Stat(path); err == nil {
		return nil
	} else if !errors.Is(err, fs.ErrNotExist) {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(hex.EncodeToString(b)), 0o600)
}

// GetOpencodePluginToken returns the webhook token, empty when the file is missing
func GetOpencodePluginToken() string {
	b, err := os.ReadFile(pluginTokenPath())
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(b))
}
