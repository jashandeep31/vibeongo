package handlers

import (
	"net/http"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/proxy/store"
	"github.com/labstack/echo/v5"
)

type websocketAuthTokenResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func WebSocketAuthTokenHandler(
	tokenStore *store.AuthTokenStore,
	proxyStore *store.ProxyManager,
) echo.HandlerFunc {
	return func(c *echo.Context) error {
		host := normalizeHost(c.Request().Host)
		proxyData, ok := proxyStore.GetProxyByHost(host)
		if !ok {
			return c.String(http.StatusNotFound, "404")
		}
		if !hasValidProxyAccessToken(c.Request().Header, proxyData.AccessToken) {
			return c.String(http.StatusUnauthorized, "401")
		}

		token, expiresAt, err := tokenStore.NewToken(host)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, struct {
				Error string `json:"error"`
			}{Error: "failed to create WebSocket auth token"})
		}

		return c.JSON(http.StatusOK, websocketAuthTokenResponse{
			Token:     token,
			ExpiresAt: expiresAt,
		})
	}
}
