package handlers

import (
	"net/http"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/labstack/echo/v5"
)

type websocketAuthTokenResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// WebSocketAuthTokenHandler issues short-lived, single-use WebSocket tokens.
func WebSocketAuthTokenHandler(tokenStore *store.AuthTokenStore) echo.HandlerFunc {
	return func(c *echo.Context) error {
		token, expiresAt, err := tokenStore.NewToken()
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
