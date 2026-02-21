package server

import (
	"github.com/jashandeep31/vibeongo/core/cmd/internal/config"
	"github.com/jashandeep31/vibeongo/core/cmd/internal/routes"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func Start() {
	// loading the env
	config.LoadEnv()

	e := echo.New()
	e.Use(middleware.RequestLogger())

	// routes of app
	routes.RegisterMiscRoutes(e)

	address := ":" + config.ENV.PORT
	if err := e.Start(address); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
}
