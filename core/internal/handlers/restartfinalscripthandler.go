package handlers

import (
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/actions"
	"github.com/labstack/echo/v5"
)

func RestartFinalScriptHandler(c *echo.Context) error {
	err := actions.ReExecuteFinalScript()
	if err != nil {
		return c.JSON(http.StatusExpectationFailed, struct {
			Error string `json:"error"`
		}{
			Error: err.Error(),
		})
	}
	return c.JSON(http.StatusOK, struct {
		Message string `json:"message"`
	}{Message: "restarted successfully"})
}
