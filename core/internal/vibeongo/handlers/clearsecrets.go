package handlers

import (
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/actions"
	"github.com/labstack/echo/v5"
)

func ClearSecretsHandler(c *echo.Context) error {
	if err := actions.ClearSecretsBeforeSuspend(); err != nil {
		return c.JSON(http.StatusInternalServerError, struct {
			Error string `json:"error"`
		}{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, struct {
		Cleared bool `json:"cleared"`
	}{Cleared: true})
}
