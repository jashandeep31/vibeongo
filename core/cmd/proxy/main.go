package main

import (
	"log"

	"github.com/jashandeep31/vibeongo/core/internal/proxy"
	"github.com/jashandeep31/vibeongo/core/internal/proxy/store"
	"github.com/joho/godotenv"
)

const Port = "5000"

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	proxyStore := store.NewProxyManager()
	srv := proxy.NewProxyServer(proxyStore)
	log.Println("Starting proxy server on :", Port)

	if err := srv.Start(":" + Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
