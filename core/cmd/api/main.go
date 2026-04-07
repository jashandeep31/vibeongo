package main

import (
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/server"
)

func main() {
	// ================== Main api server setup ==================
	err := server.Start()
	fmt.Println(err)
}
