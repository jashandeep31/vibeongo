package routes

import (
	"github.com/jashandeep31/vibeongo/core/internal/proxy/handlers"
	"github.com/labstack/echo/v5"
)

func ProxyRouter(e *echo.Echo) {
	h := handlers.NewHanlder()

	e.GET("/proxy/version", h.HandleHelloWorld)
	e.GET("/", h.HandleHelloWorld)
}
