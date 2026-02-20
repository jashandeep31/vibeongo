package server

import (
	"github.com/jashandeep31/vibeongo/core/cmd/internal/routes"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func Start() {
	e := echo.New()
	e.Use(middleware.RequestLogger())

	// routes of app
	routes.RegisterMiscRoutes(e)

	if err := e.Start(":8000"); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
}
