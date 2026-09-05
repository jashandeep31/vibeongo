package server

import (
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/routes"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

// Start starts the application.
func Start() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}

	// go handlers.GetAllowedPortsTestfunc()
	e := echo.New()

	// spinning up the opencode web server
	// openCode := store.NewOpencodeWeb()
	// t3Code := store.NewT3Code()

	tools := store.NewTools()

	// NOTE: we are not using this option any more as this starting the opencode server before the complete setup causes the issue of not loading the folders of that project properly
	// go func() {
	// 	if err := openCode.StartWebServer(); err != nil {
	// 		e.Logger.Error("failed to start opencode web server", "error", err)
	// 	}
	// }()
	//
	//
	//NOTE: testing purposes remove this in the production
	go func() {
		// time.Sleep(10 * time.Second)
		// tools.OpenCode.StartWebServer()
	}()

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
