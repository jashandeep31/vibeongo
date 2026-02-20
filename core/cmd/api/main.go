package main

import (
	"fmt"
	"time"

	"github.com/jashandeep31/vibeongo/core/cmd/internal/server"
)

var startTime = time.Now()

func main() {
	fmt.Println(startTime.Year())
	server.Start(startTime)
}
