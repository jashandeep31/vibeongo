package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/shirou/gopsutil/v4/mem"
)

func StatsHandler(c *echo.Context) error {
	res := c.Response()
	req := c.Request()

	// SSE headers
	res.Header().Set("Content-Type", "text/event-stream")
	res.Header().Set("Cache-Control", "no-cache")
	res.Header().Set("Connection", "keep-alive")

	memT := time.NewTicker(1 * time.Second)
	defer memT.Stop()
	cpuT := time.NewTicker(1 * time.Second)
	defer cpuT.Stop()

	for {
		select {
		case <-req.Context().Done():
			fmt.Println("Client disconnected")
			return nil

		case <-memT.C:
			m, err := mem.VirtualMemory()
			if err != nil {
				return err
			}

			data := fmt.Sprintf(
				"data: RAM: %.2f%% Used: %vMB Free: %vMB Time: %s\n\n",
				m.UsedPercent,
				m.Used/1024/1024,
				m.Free/1024/1024,
				time.Now().Format(time.RFC3339),
			)

			if _, err := res.Write([]byte(data)); err != nil {
				return err
			}

			// flush immediately
			if err := http.NewResponseController(res).Flush(); err != nil {
				return err
			}
		}
	}
}
