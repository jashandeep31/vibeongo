package middlewares

import (
	"net"
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
	"github.com/labstack/echo/v5"
)

func CheckOpencodePluginAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c *echo.Context) error {
		c.Response().Header().Set("Cache-Control", "no-store")
		c.Response().Header().Set("Pragma", "no-cache")
		host, _, err := net.SplitHostPort(c.Request().RemoteAddr)
		ip := net.ParseIP(host)
		if err != nil || ip == nil || !ip.IsLoopback() || len(c.Request().Header.Values("Origin")) != 0 {
			return c.String(http.StatusForbidden, "Forbidden")
		}
		return CheckLocalAuth(utils.GetOpencodePluginToken())(next)(c)
	}
}
