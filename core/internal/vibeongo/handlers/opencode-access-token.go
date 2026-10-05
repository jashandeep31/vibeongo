package handlers

import (
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/actions"
	"github.com/labstack/echo/v5"
)

func OpencodeAccessTokenHandler(c *echo.Context) error {
	token, err := actions.GetOpencodeAccessToken(c.Request().Context())
	if err != nil {
		status, message := actions.OpencodeAccessTokenFailure(err)
		return c.JSON(status, map[string]string{"error": message})
	}
	return c.JSON(http.StatusOK, struct {
		Data actions.OpencodeAccessToken `json:"data"`
	}{Data: token})
}
