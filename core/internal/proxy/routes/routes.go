package routes

import (
	"github.com/jashandeep31/vibeongo/core/internal/proxy/handlers"
	"github.com/jashandeep31/vibeongo/core/internal/proxy/middlewares"
	"github.com/jashandeep31/vibeongo/core/internal/proxy/store"
	"github.com/labstack/echo/v5"
)

func Register(
	e *echo.Echo,
	proxyStore *store.ProxyManager,
	version string,
	buildTime string,
	proxyServerToken string,
) {
	h := handlers.NewHandler(proxyStore, version, buildTime)

	e.GET("/proxy/version", h.Status)
	e.POST(
		"/proxy/invalidate",
		h.Invalidate,
		middlewares.CheckProxyAuth(proxyServerToken),
	)
	e.GET(
		"/proxy/list",
		h.List,
		middlewares.CheckProxyAuth(proxyServerToken),
	)
	e.GET("/proxy/my-ip", h.MyIP)
	e.Any("/*", h.ReverseProxy)
}
