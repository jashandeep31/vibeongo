package routes

import (
	"github.com/jashandeep31/vibeongo/core/internal/handlers"
	"github.com/jashandeep31/vibeongo/core/internal/ws"
	"github.com/labstack/echo/v5"
)

func Register(e *echo.Echo) {
	e.GET("/", handlers.Health)
	e.GET("/ws", ws.WebSocket)
	e.GET("/ufw", handlers.GetAllowedPorts)
	e.POST("/reboot", handlers.RebootServer)
	e.POST("/restart-final-script", handlers.RestartFinalScriptHandler)

	e.GET("/opencode/web/status", handlers.OpenCodeWebStatus)
	e.POST("/opencode/web", handlers.OpenCodeWebActions)
}
