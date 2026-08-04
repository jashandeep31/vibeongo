package handlers

import (
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/labstack/echo/v5"
)

type toolStats struct {
	Running bool `json:"running"`
}

type toolsStats struct {
	OpenCode toolStats `json:"opencode"`
	T3Code   toolStats `json:"t3Code"`
}

// ToolsStatsHandler returns the current status of every managed coding tool.
func ToolsStatsHandler(tools *store.Tools) echo.HandlerFunc {
	return func(c *echo.Context) error {
		stats := toolsStats{}
		if tools != nil {
			if tools.OpenCode != nil {
				stats.OpenCode.Running = tools.OpenCode.IsRunning()
			}
			if tools.T3Code != nil {
				stats.T3Code.Running = tools.T3Code.Status()
			}
		}

		return c.JSON(http.StatusOK, stats)
	}
}
