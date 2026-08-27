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
	tokenStore := store.NewAuthTokenStore()
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

	// Browser WebSockets cannot send the proxy authorization header. Exchange
	// the host's access token for a short-lived token without shadowing the
	// upstream runtime's /ws/token route.
	e.POST(
		"/proxy/ws-token",
		handlers.WebSocketAuthTokenHandler(tokenStore, proxyStore),
	)

	e.GET("/proxy/my-ip", h.MyIP)
	e.Any("/*", h.ReverseProxy)
}
