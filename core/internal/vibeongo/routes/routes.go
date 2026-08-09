package routes

import (
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/handlers"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/middlewares"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/ws"
	"github.com/labstack/echo/v5"
)

func Register(e *echo.Echo, tools *store.Tools, localToken string) {
	e.GET("/", handlers.Health)
	e.GET("/ws", ws.WebSocket(tools), middlewares.CheckLocalWebSocketAuth(localToken))

	protected := e.Group("")
	protected.Use(middlewares.CheckLocalAuth(localToken))
	protected.GET("/tools-stats", handlers.ToolsStatsHandler(tools))
	protected.GET("/stats", handlers.GetRuntimeStats)
	protected.GET("/ufw", handlers.GetAllowedPorts)
	protected.POST("/restart-dev-script", handlers.RestartDevScriptHandler)
	protected.GET("/terminate-after-done", handlers.GetTerminateAfterDone)
	protected.POST("/terminate-after-done/disable", handlers.DisableTerminateAfterDone)
}
