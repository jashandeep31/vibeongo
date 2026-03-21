package server

import (
	"database/sql"
	"log"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/routes"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func Start() {
	// loading the env
	config.LoadEnv()

	e := echo.New()
	e.Use(middleware.RequestLogger())

	_, err := sql.Open("sqlite", "./test.sql")
	if err != nil {
		log.Fatalf("Failed to connect the db")
	}
	// routes of app
	routes.RegisterMiscRoutes(e)
	routes.RegisterWSRoutes(e)

	address := ":" + config.ENV.PORT
	if err := e.Start(address); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
}
