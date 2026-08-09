package handlers

import (
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/labstack/echo/v5"
)

type terminateAfterDoneResponse struct {
	Terminate bool `json:"terminate"`
}

func GetTerminateAfterDone(c *echo.Context) error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, struct {
			Error string `json:"error"`
		}{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, terminateAfterDoneResponse{
		Terminate: cfg.InstanceConfig.Terminate,
	})
}

func DisableTerminateAfterDone(c *echo.Context) error {
	if err := config.DisableTerminateAfterDone(); err != nil {
		return c.JSON(http.StatusInternalServerError, struct {
			Error string `json:"error"`
		}{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, terminateAfterDoneResponse{
		Terminate: false,
	})
}
