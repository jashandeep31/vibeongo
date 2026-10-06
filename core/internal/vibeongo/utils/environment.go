package utils

import (
	"os"
	"sync"

	"github.com/joho/godotenv"
)

var loadEnvOnce sync.Once

// IsDevelopment reports ENVIRONMENT="development" from the environment or a
// .env in the working directory; anything else (or nothing) means production
func IsDevelopment() bool {
	loadEnvOnce.Do(func() {
		// no .env on a production instance, which is fine
		_ = godotenv.Load()
	})
	return os.Getenv("ENVIRONMENT") == "development"
}
