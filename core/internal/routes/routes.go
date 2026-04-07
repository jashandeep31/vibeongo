package routes

import (
	"github.com/jashandeep31/vibeongo/core/internal/handlers"
	"github.com/jashandeep31/vibeongo/core/internal/ws"
	"github.com/labstack/echo/v5"
)

func Register(e *echo.Echo) {
	e.GET("/", handlers.Health)
	e.GET("/stats", handlers.StatsHandler)
	e.GET("/ws", ws.WebSocket)
	// e.POST("/reboot", handlers.RebootServer)

	// opencode related routes
	// e.GET("/opencode", handlers.LaunchOpenCodeWeb)
	e.GET("/opencode/web/status", handlers.OpenCodeWebStatus)
	e.POST("/opencode/web", handlers.OpenCodeWeb)
}
