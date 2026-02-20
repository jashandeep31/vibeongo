package main

import (
	"fmt"
	"log"
	"os"
)

func main() {
	fmt.Println("Bootstrap script is running")
	currentPath, err := os.Getwd()
	if err != nil {
		log.Logger("Failed to get the currentPath")
	}
	fmt.Println(currentPath)
}
