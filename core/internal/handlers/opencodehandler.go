package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/store"
	"github.com/labstack/echo/v5"
)

const openCodeWebPort = 4096

type OpenCodeWebBody struct {
	Action string `json:"action"`
}

type OpenCodeWebResponse struct {
	Message string `json:"message"`
	Running bool   `json:"running"`
}

func OpenCodeWebActions(openCode *store.OpencodeWeb) echo.HandlerFunc {
	return func(c *echo.Context) error {
		var body OpenCodeWebBody

		if err := c.Bind(&body); err != nil {
			return c.JSON(http.StatusBadRequest, OpenCodeWebResponse{
				Message: "bad request",
				Running: openCode.IsRunning(),
			})
		}

		switch body.Action {
		case "start":
			if openCode.IsRunning() {
				return c.JSON(http.StatusOK, OpenCodeWebResponse{
					Message: fmt.Sprintf("Opencode web server is already running at port %d", openCodeWebPort),
					Running: true,
				})
			}

			if err := openCode.StartWebServer(); err != nil {
				return c.JSON(http.StatusInternalServerError, OpenCodeWebResponse{
					Message: fmt.Sprintf("failed to start Opencode web server: %v", err),
					Running: openCode.IsRunning(),
				})
			}

			// Note: temp sleep to allow the server to spin up
			time.Sleep(3 * time.Second)

			return c.JSON(http.StatusOK, OpenCodeWebResponse{
				Message: fmt.Sprintf("Opencode web server is starting at port %d", openCodeWebPort),
				Running: true,
			})

		case "stop":
			if !openCode.IsRunning() {
				return c.JSON(http.StatusOK, OpenCodeWebResponse{
					Message: "Opencode web server is not currently running.",
					Running: false,
				})
			}

			if err := openCode.StopWebServer(); err != nil {
				return c.JSON(http.StatusInternalServerError, OpenCodeWebResponse{
					Message: fmt.Sprintf("failed to stop Opencode web server: %v", err),
					Running: openCode.IsRunning(),
				})
			}

			return c.JSON(http.StatusOK, OpenCodeWebResponse{
				Message: "Opencode web server stopped successfully.",
				Running: false,
			})

		default:
			return c.JSON(http.StatusBadRequest, OpenCodeWebResponse{
				Message: fmt.Sprintf("only start and stop actions are valid and you sent '%s'", body.Action),
				Running: openCode.IsRunning(),
			})
		}
	}
}

func OpenCodeWebStatus(openCode *store.OpencodeWeb) echo.HandlerFunc {
	return func(c *echo.Context) error {
		cfg, err := config.LoadAndValidate("config.json")
		if err != nil {
			return c.JSON(http.StatusInternalServerError, OpenCodeWebResponse{
				Message: fmt.Sprintf("failed to load config: %v", err),
				Running: openCode.IsRunning(),
			})
		}

		if cfg.OpenCode == nil {
			return c.JSON(http.StatusBadRequest, OpenCodeWebResponse{
				Message: "Opencode is not configured",
				Running: openCode.IsRunning(),
			})
		}

		return c.JSON(http.StatusOK, OpenCodeWebResponse{
			Message: "Opencode web server status fetched successfully.",
			Running: openCode.IsRunning(),
		})
	}
}
