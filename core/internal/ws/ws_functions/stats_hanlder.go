package wsfunctions

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/mem"
)

type StatsMessage struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
	CPUPercent  float64 `json:"cpu_percent"`
	Time        string  `json:"time"`
}

func StatsHandler(c *websocket.Conn) {
	memT := time.NewTicker(time.Second)
	defer memT.Stop()

	defer c.Close()

	for {
		select {
		case <-memT.C:
			// RAM
			m, err := mem.VirtualMemory()
			if err != nil {
				log.Println("mem error:", err)
				return
			}

			// CPU
			cpuPercent, err := cpu.Percent(0, false)
			if err != nil {
				log.Println("cpu error:", err)
				return
			}

			msg := StatsMessage{
				Total:       m.Total,
				Used:        m.Used,
				Free:        m.Free,
				UsedPercent: m.UsedPercent,
				CPUPercent:  cpuPercent[0],
				Time:        time.Now().Format(time.RFC3339),
			}

			// send JSON directly
			if err := c.WriteJSON(msg); err != nil {
				log.Println("write error:", err)
				return
			}
		}
	}
}
