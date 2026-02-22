package bootstrap

import (
	"fmt"
	"log"
)

func Run() {
	// gettting the config json file
	file, err := LoadConfig("config.json")
	if err != nil {
		log.Fatalf("application startup failed: %v", err)
	}

	// validated validatedConfig
	validatedConfig, err := ValidateConfig(file)
	if err != nil {
		log.Fatalf("config is here")
	}

	for _, pkg := range validatedConfig.Packages {
		fmt.Printf("working for the %s package\n", pkg.Name)
	}
}
