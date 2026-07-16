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

	// TODO: please use the proper cors way
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000", "https://vibeongo.com", "https://www.vibeongo.com"},
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
			echo.HeaderAuthorization,
		},
	}))

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
