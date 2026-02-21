package routes

import (
	"github.com/jashandeep31/vibeongo/core/cmd/internal/handlers"
	"github.com/labstack/echo/v5"
)

func RegisterMiscRoutes(e *echo.Echo) {
	e.GET("/", handlers.Health)
}
