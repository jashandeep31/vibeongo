package server

import (
	"database/sql"
	"log"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/routes"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	_ "modernc.org/sqlite"
)

func Start() {
	// loading the env
	config.LoadEnv()

	e := echo.New()
	e.Use(middleware.RequestLogger())

	dbConn, err := sql.Open("sqlite", "./test.db")
	if err != nil {
		log.Fatalf("Failed to connect the db")
	}
	defer dbConn.Close()

	m, err := migrate.New("file://internal/db/migrations", "sqlite://test.db")
	if err != nil {
		log.Fatal(err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatal(err)
	}

	// routes of app
	routes.RegisterMiscRoutes(e, dbConn)
	routes.RegisterWSRoutes(e)

	address := ":" + config.ENV.PORT
	if err := e.Start(address); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
}
