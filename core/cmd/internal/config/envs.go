package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type envs struct {
	PORT string
}

var ENV envs

func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  .env file not found, using system environment variables")
	}

	ENV = envs{
		PORT: GetEnvValue("PORT"),
	}
}

func GetEnvValue(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("❌ Required environment variable %s is missing", key)
	}
	return value
}
