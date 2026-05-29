package wsfunctions

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/mem"
)

type StatsData struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
	CPUPercent  float64 `json:"cpu_percent"`
	Time        string  `json:"time"`
}

type cpuUsageSampler struct {
	previous *cpu.TimesStat
}

func (s *cpuUsageSampler) Percent() (float64, error) {
	times, err := cpu.Times(false)
	if err != nil {
		return 0, err
	}
	if len(times) == 0 {
		return 0, nil
	}

	current := times[0]
	if s.previous == nil {
		s.previous = &current
		return 0, nil
	}

	previousIdle := s.previous.Idle + s.previous.Iowait
	currentIdle := current.Idle + current.Iowait

	previousTotal := totalCPUTime(*s.previous)
	currentTotal := totalCPUTime(current)

	idleDelta := currentIdle - previousIdle
	totalDelta := currentTotal - previousTotal
	s.previous = &current

	if totalDelta <= 0 {
		return 0, nil
	}

	usedPercent := (1 - idleDelta/totalDelta) * 100
	if usedPercent < 0 {
		return 0, nil
	}
	if usedPercent > 100 {
		return 100, nil
	}

	return usedPercent, nil
}

func totalCPUTime(times cpu.TimesStat) float64 {
	return times.User +
		times.System +
		times.Idle +
		times.Nice +
		times.Iowait +
		times.Irq +
		times.Softirq +
		times.Steal +
		times.Guest +
		times.GuestNice
}

func StatsHandler(ctx context.Context, c *websocket.Conn, writeMu *sync.Mutex) {
	memT := time.NewTicker(1 * time.Second)
	defer memT.Stop()

	cpuSampler := &cpuUsageSampler{}
	if _, err := cpuSampler.Percent(); err != nil {
		log.Println("cpu error:", err)
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-memT.C:
			// RAM
			m, err := mem.VirtualMemory()
			if err != nil {
				log.Println("mem error:", err)
				return
			}

			// Keep the stats stream alive if CPU sampling is temporarily unavailable.
			cpuPercent, err := cpuSampler.Percent()
			currentCPUPercent := 0.0
			if err != nil {
				log.Println("cpu error:", err)
			} else {
				currentCPUPercent = cpuPercent
			}

			statsData := StatsData{
				Total:       m.Total,
				Used:        m.Used,
				Free:        m.Free,
				UsedPercent: m.UsedPercent,
				CPUPercent:  currentCPUPercent,
				Time:        time.Now().Format(time.RFC3339),
			}
			msg := struct {
				Type string `json:"type"`
				Data any    `json:"data"`
			}{
				Type: "stats",
				Data: statsData,
			}

			// send JSON directly
			writeMu.Lock()
			writeErr := c.WriteJSON(msg)
			writeMu.Unlock()
			if writeErr != nil {
				log.Println("write error:", writeErr)
				return
			}
		}
	}
}
