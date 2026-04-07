package server

import (
	"embed"

	// _ "github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/routes"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	_ "modernc.org/sqlite"
)

var migrationsFS embed.FS

// Start

// Start starts the application.
func Start() error {
	if _, err := config.LoadAndValidate("config.json"); err != nil {
		return err
	}

	e := echo.New()
	// TODO: please use the proper cors way
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000"},
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
		},
	}))

	e.Use(middleware.RequestLogger())

	// routes of app
	routes.Register(e)

	// address := ":" + config.ENV.PORT
	address := ":" + "8080"
	if err := e.Start(address); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
	return nil
}
