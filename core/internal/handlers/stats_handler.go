package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/sse"
	"github.com/labstack/echo/v5"
)

func StatsHandler(c *echo.Context) error {
	// Headers for the server side events
	w := c.Response()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	fmt.Println("hi stats are working")

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	count := uint64(0)
	for {
		select {
		case <-c.Request().Context().Done():
			log.Printf("SSE client disconnected, ip: %v", c.RealIP())
			return nil
		case <-ticker.C:
			count++
			event := sse.Event{
				Data: []byte(fmt.Sprintf("count: %d, time: %s\n\n", count, time.Now().Format(time.RFC3339Nano))),
			}
			if err := event.MarshalTo(w); err != nil {
				return err
			}
			if err := http.NewResponseController(w).Flush(); err != nil {
				return err
			}
		}
	}
}
