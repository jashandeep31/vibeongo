package provisions

import (
	"fmt"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

// Setup the opencode auth.json file
func SetupOpenCode(cfg *config.OpenCodeConfig) {
	// opencode is pre-insatlled in the ami
	fmt.Println("opencode config")
	authJSON := cfg.AuthJSON

	authfilePath := "/home/ubuntu/.local/share/opencode/auth.json"
	os.WriteFile(authfilePath, authJSON, 0644)
	fmt.Println("updated the auth.json")
}
