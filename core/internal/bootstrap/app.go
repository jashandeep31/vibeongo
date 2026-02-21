package bootstrap

import (
	"fmt"
	"log"
)

func Run() {
	// gettting the config json file
	file, err := LoadConfig("test.json")
	if err != nil {
		log.Fatalf("application startup failed: %v", err)
	}
	fmt.Println(string(file))

	// TODO: validate the json file
}
