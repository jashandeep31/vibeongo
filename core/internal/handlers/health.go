package handlers

import (
	"net/http"

	"github.com/labstack/echo/v5"
)

type HealthResponse struct {
	Message string `json:"message"`
}

func Health(c *echo.Context) error {
	return c.JSON(http.StatusOK, HealthResponse{
		Message: "Hello world",
	})
}
