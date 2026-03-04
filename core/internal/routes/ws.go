package routes

import (
	"github.com/jashandeep31/vibeongo/core/internal/ws"
	"github.com/labstack/echo/v5"
)

func RegisterWSRoutes(e *echo.Echo) {
	e.GET("/ws", ws.WebSocket)
}
