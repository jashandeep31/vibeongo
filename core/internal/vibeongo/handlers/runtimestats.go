package handlers

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/mem"
)

type runtimeStatsResponse struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
	CPUPercent  float64 `json:"cpu_percent"`
	Time        string  `json:"time"`
}

func GetRuntimeStats(c *echo.Context) error {
	memoryStats, err := mem.VirtualMemory()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to read memory stats",
		})
	}

	cpuPercent, err := cpu.Percent(200*time.Millisecond, false)
	if err != nil || len(cpuPercent) == 0 {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "failed to read CPU stats",
		})
	}

	return c.JSON(http.StatusOK, runtimeStatsResponse{
		Total:       memoryStats.Total,
		Used:        memoryStats.Used,
		Free:        memoryStats.Free,
		UsedPercent: memoryStats.UsedPercent,
		CPUPercent:  cpuPercent[0],
		Time:        time.Now().Format(time.RFC3339),
	})
}
