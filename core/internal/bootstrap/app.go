package bootstrap

import (
	"log"
)

func Run() {
	// gettting the config json file
	file, err := LoadConfig("config.json")
	if err != nil {
		log.Fatalf("application startup failed: %v", err)
	}

	ValidateConfig(file)
	// TODO: validate the json file
}
