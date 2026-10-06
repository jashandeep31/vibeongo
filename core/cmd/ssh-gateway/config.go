package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// The gateway is commonly launched from the repository root, core/, or its
// command directory. Load core's .env in each case without replacing values
// already supplied by the process environment.
func loadGatewayEnvironment() (string, error) {
	for _, candidate := range []string{"core/.env", ".env", "../../.env"} {
		info, err := os.Stat(candidate)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return "", fmt.Errorf("inspect gateway environment file: %w", err)
		}
		if !info.Mode().IsRegular() {
			continue
		}
		if err := godotenv.Load(candidate); err != nil {
			return "", fmt.Errorf("load gateway environment file: %w", err)
		}
		absolutePath, err := filepath.Abs(candidate)
		if err != nil {
			return "", fmt.Errorf("resolve gateway environment file: %w", err)
		}
		return filepath.Dir(absolutePath), nil
	}
	// Deployed processes may supply the same settings without an .env file.
	return os.Getwd()
}
