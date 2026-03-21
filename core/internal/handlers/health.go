package handlers

import (
	"net/http"

	"github.com/labstack/echo/v5"
)

func Health(c *echo.Context) error {
	version := "v0.0.1"
	return c.JSON(http.StatusOK, struct {
		Message string `json:"message"`
	}{
		Message: "Hi, Your sandbox server is running " + version,
	})
}
