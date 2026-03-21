package server

import (
	"database/sql"
	"embed"
	"log"

	"github.com/golang-migrate/migrate/v4"

	// _ "github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jashandeep31/vibeongo/core/internal/routes"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	_ "modernc.org/sqlite"
)

var migrationsFS embed.FS

func Start() {
	// loading the env
	// config.LoadEnv()

	e := echo.New()
	e.Use(middleware.RequestLogger())

	dbConn, err := sql.Open("sqlite", "./test.db")
	if err != nil {
		log.Fatalf("Failed to connect the db")
	}
	defer dbConn.Close()
	// routes of app
	routes.RegisterMiscRoutes(e, dbConn)
	routes.RegisterWSRoutes(e)

	// address := ":" + config.ENV.PORT
	address := ":" + "8000"
	if err := e.Start(address); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
}

func runMigrations() {
	d, err := iofs.New(migrationsFS, "internal/db/migrations")
	if err != nil {
		log.Fatal(err)
	}

	m, err := migrate.NewWithSourceInstance(
		"iofs",
		d,
		"sqlite3:///home/ubuntu/test.db", // IMPORTANT: absolute path
	)
	if err != nil {
		log.Fatal(err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatal(err)
	}
}
