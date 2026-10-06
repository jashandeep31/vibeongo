package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/actions"
	"github.com/labstack/echo/v5"
)

func RenewOpencodeCredentialsHandler(c *echo.Context) error {
	c.Response().Header().Set("Cache-Control", "no-store")
	ctx, cancel := context.WithTimeout(c.Request().Context(), 90*time.Second)
	defer cancel()
	result, err := actions.RenewOpencodeCredentials(ctx)
	if err != nil {
		status, message := actions.OpencodeAccessTokenFailure(err)
		return c.String(status, message)
	}
	return c.JSON(http.StatusOK, result)
}
