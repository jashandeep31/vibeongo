package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

type TestSchema struct {
	Name string `json:"name" validate:"required,min=4"`
}

func main() {
	fmt.Println("Bootstrap script is running")

	content, err := os.ReadFile("test.json")
	if err != nil {
		log.Fatalf("Failed to read file: %v", err)
	}

	fmt.Println(string(content))
	var data TestSchema

	// 1️⃣ Decode JSON into struct
	err = json.Unmarshal(content, &data)
	if err != nil {
		log.Fatalf("Invalid JSON: %v", err)
	}

	// 2️⃣ Validate struct
	err = validate.Struct(data)
	if err != nil {
		fmt.Println("Validation errors:")
		for _, e := range err.(validator.ValidationErrors) {
			fmt.Printf("Field %s failed on %s\n", e.Field(), e.Tag())
		}
		return
	}

	fmt.Println("Valid JSON:", data)
}
