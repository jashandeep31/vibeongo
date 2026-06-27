package routes

import (
	"github.com/jashandeep31/vibeongo/core/internal/handlers"
	"github.com/jashandeep31/vibeongo/core/internal/store"
	"github.com/jashandeep31/vibeongo/core/internal/ws"
	"github.com/labstack/echo/v5"
)

func Register(e *echo.Echo, tools *store.Tools) {
	e.GET("/", handlers.Health)
	e.GET("/ws", ws.WebSocket(tools))
	e.GET("/ufw", handlers.GetAllowedPorts)
	e.POST("/restart-final-script", handlers.RestartFinalScriptHandler)
}
