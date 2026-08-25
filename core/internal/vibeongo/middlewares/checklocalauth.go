package middlewares

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/labstack/echo/v5"
)

func CheckLocalAuth(expectedToken string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			if expectedToken == "" {
				return c.String(http.StatusUnauthorized, "Unauthorized")
			}

			scheme, token, ok :=
				strings.Cut(c.Request().Header.Get(echo.HeaderAuthorization), " ")
			if !ok || !strings.EqualFold(scheme, "Bearer") || token == "" ||
				strings.Contains(token, " ") {
				return c.String(http.StatusUnauthorized, "Unauthorized")
			}

			if subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
				return c.String(http.StatusUnauthorized, "Unauthorized")
			}

			return next(c)
		}
	}
}

func CheckLocalWebSocketAuth(expectedToken string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			token := c.QueryParam("token")
			if expectedToken == "" || token == "" {
				return c.String(http.StatusUnauthorized, "Unauthorized")
			}

			if subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
				return c.String(http.StatusUnauthorized, "Unauthorized")
			}

			return next(c)
		}
	}
}

// CheckVibeongoWebSocketAuth validates and consumes a one-time WebSocket token.
func CheckVibeongoWebSocketAuth(tokenStore *store.AuthTokenStore) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			vibeongoToken := c.QueryParam("vibeongoToken")
			if tokenStore == nil || !tokenStore.ValidateToken(vibeongoToken) {
				return c.String(http.StatusUnauthorized, "Unauthorized")
			}

			return next(c)
		}
	}
}
