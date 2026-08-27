package routes

import (
	"github.com/jashandeep31/vibeongo/core/internal/proxy/handlers"
	"github.com/jashandeep31/vibeongo/core/internal/proxy/middlewares"
	ts "github.com/jashandeep31/vibeongo/core/internal/shared/store"

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
	tokenStore := ts.NewAuthTokenStore()
	h := handlers.NewHandler(proxyStore, version, buildTime, tokenStore)

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

	// route to get the ws temp token
	e.POST("/ws/token", handlers.WebSocketAuthTokenHandler(tokenStore), middlewares.CheckProxyAuth(proxyServerToken))

	e.GET("/proxy/my-ip", h.MyIP)
	e.Any("/*", h.ReverseProxy)
}
