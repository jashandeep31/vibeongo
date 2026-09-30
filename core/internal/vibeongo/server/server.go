package server

import (
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/routes"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

// Start starts the application.
func Start() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}

	e := echo.New()

	tools := store.NewTools()

	go func() {
		if err := tools.OpenCode.StartWebServerWithRetry(); err != nil {
			e.Logger.Error("failed to start opencode web server", "error", err)
		}
	}()

	if err := utils.EnsurePluginTokenFile(); err != nil {
		return err
	}

	// Allow requests from every origin. Echo reflects requested headers for
	// preflight requests when no explicit AllowHeaders list is configured.
	e.Use(middleware.CORS("*"))

	e.Use(middleware.RequestLogger())

	// routes of app
	routes.Register(e, tools, cfg.InstanceConfig.VibeongoLocalToken)

	// address := ":" + config.ENV.PORT
	address := ":" + "3101"
	if err := e.Start(address); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}
	return nil
}
