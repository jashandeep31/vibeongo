package server

import (
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/routes"
	"github.com/jashandeep31/vibeongo/core/internal/store"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

// Start starts the application.
func Start() error {
	if _, err := config.LoadAndValidate("config.json"); err != nil {
		return err
	}

	// go handlers.GetAllowedPortsTestfunc()
	e := echo.New()

	// spinning up the opencode web server
	openCode := store.NewOpencodeWeb()
	go func() {
		if err := openCode.StartWebServer(); err != nil {
			e.Logger.Error("failed to start opencode web server", "error", err)
		}
	}()

	// TODO: please use the proper cors way
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000", "https://vibeongo.com", "https://www.vibeongo.com", "https://l2.devsradar.com"},
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
		},
	}))

	e.Use(middleware.RequestLogger())

	// routes of app
	routes.Register(e, openCode)

	// address := ":" + config.ENV.PORT
	address := ":" + "8080"
	if err := e.Start(address); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
	return nil
}
