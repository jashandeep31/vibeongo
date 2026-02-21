package bootstrap

import (
	"fmt"
	"os"
)

func LoadConfig(filename string) ([]byte, error) {
	file, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("Failed to load the config: %w", err)
	}
	return file, nil
}
