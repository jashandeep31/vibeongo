package bootstrap

import (
	"encoding/json"
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func ValidateConfig(file []byte) (config.Config, error) {
	var cfg config.Config
	if err := json.Unmarshal(file, &cfg); err != nil {
		return cfg, fmt.Errorf("Error in parsing the config: %w", err)
	}

	return cfg, nil
}
