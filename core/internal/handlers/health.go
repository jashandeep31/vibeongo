package handlers

import (
	"net/http"

	"github.com/labstack/echo/v5"
)

var (
	Version   = "dev"
	BuildTime = "unknown"
)

func Health(c *echo.Context) error {
	return c.JSON(http.StatusOK, struct {
		Message string `json:"message"`
		V       string `json:"v"`
	}{
		Message: "Hi, Your sandbox server is running",
		V:       Version + " " + BuildTime,
	})
}
