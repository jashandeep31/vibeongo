package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

func main() {
	fmt.Println("Bootstrap script is running")

	content, err := os.ReadFile("test.json")
	if err != nil {
		log.Fatalf("Failed to create the file test")
	}

	var data map[string]any

	err = json.Unmarshal(content, &data)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(data)
}
