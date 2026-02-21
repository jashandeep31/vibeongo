package bootstrap

import (
	"fmt"
	"os"
)

func LoadConfig() ([]byte, error) {
	// read the json file so that we can check waht we can with it
	fmt.Println("Config is getting loaded")

	file, err := os.ReadFile("config.json")
	if err != nil {
		return nil, fmt.Errorf("Failed to load the config %w", err)
	}
	fmt.Println(string(file))
	return file, nil
}
