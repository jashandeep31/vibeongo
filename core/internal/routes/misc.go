package routes

import (
	"database/sql"

	"github.com/jashandeep31/vibeongo/core/internal/handlers"
	"github.com/labstack/echo/v5"
)

func RegisterMiscRoutes(e *echo.Echo, db *sql.DB) {
	e.GET("/", handlers.Health)
}
