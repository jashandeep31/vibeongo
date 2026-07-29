package middlewares

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/labstack/echo/v5"
)

func CheckProxyAuth(expectedToken string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			scheme, token, found := strings.Cut(
				c.Request().Header.Get(echo.HeaderAuthorization),
				" ",
			)
			if expectedToken == "" ||
				!found ||
				!strings.EqualFold(scheme, "Bearer") ||
				token == "" ||
				strings.Contains(token, " ") ||
				subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
				return c.String(http.StatusUnauthorized, "401")
			}

			return next(c)
		}
	}
}
