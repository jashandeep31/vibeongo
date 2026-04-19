package main

import (
	"log"

	"github.com/jashandeep31/vibeongo/core/internal/server"
	"github.com/jashandeep31/vibeongo/core/internal/store"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(".env.proxy"); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	proxyStore := store.NewProxyManager()
	srv := server.NewProxyServer(proxyStore)

	log.Println("Starting proxy server on :5000")
	if err := srv.Start(":5000"); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
