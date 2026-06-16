package handlers

import (
	"fmt"
	"net/http"
	"os/exec"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/jashandeep31/vibeongo/core/internal/utils"
	"github.com/labstack/echo/v5"
)

var openCodeWebServer = struct {
	running bool
	port    int
	cmd     *exec.Cmd
}{
	running: false,
	port:    4096,
}

type OpenCodeWebBody struct {
	Action string `json:"action"`
}

type OpenCodeWebResponse struct {
	Message string `json:"message"`
	Running bool   `json:"running"`
}

func OpenCodeWebActions(c *echo.Context) error {
	var body OpenCodeWebBody

	// binding the body from http request
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, OpenCodeWebResponse{
			Message: "bad request",
			Running: openCodeWebServer.running,
		})
	}

	switch body.Action {
	case "start":
		fmt.Println("starting the session")
		// kill session before starting ::: No error as there could be no session tooo
		utils.KilltmuxSession("ops")

		// creating the tmux session
		err := utils.StartTmuxSession("ops", "/home/ubuntu/code")
		if err != nil {
			return c.JSON(http.StatusInternalServerError, OpenCodeWebResponse{
				Message: fmt.Sprintf("failed to start tmux session: %v", err),
				Running: openCodeWebServer.running,
			})
		}

		err = utils.RunCommandInTmuxSession("ops", "opencode web --port 4096 --hostname 0.0.0.0")
		if err != nil {
			return c.JSON(http.StatusInternalServerError, OpenCodeWebResponse{
				Message: fmt.Sprintf("failed to run command in tmux session: %v", err),
				Running: openCodeWebServer.running,
			})
		}

		openCodeWebServer.running = true
		return c.JSON(http.StatusOK, OpenCodeWebResponse{
			Message: fmt.Sprintf("Opencode web server is starting at port %d", openCodeWebServer.port),
			Running: true,
		})

	case "stop":
		utils.KilltmuxSession("ops")
		openCodeWebServer.running = false
		return c.JSON(http.StatusOK, OpenCodeWebResponse{
			Message: "Opencode web server stopped successfully.",
			Running: false,
		})

	default:
		return c.JSON(http.StatusBadRequest, OpenCodeWebResponse{
			Message: fmt.Sprintf("only start and stop actions are valid and you sent '%s'", body.Action),
			Running: openCodeWebServer.running,
		})
	}
}

func OpenCodeWebStatus(c *echo.Context) error {
	// checking if opencode is configured
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, OpenCodeWebResponse{
			Message: fmt.Sprintf("failed to load config: %v", err),
			Running: openCodeWebServer.running,
		})
	}

	if cfg.OpenCode == nil {
		return c.JSON(http.StatusBadRequest, OpenCodeWebResponse{
			Message: "Opencode is not configured",
			Running: openCodeWebServer.running,
		})
	}

	return c.JSON(http.StatusOK, OpenCodeWebResponse{
		Message: "Opencode web server status fetched successfully.",
		Running: openCodeWebServer.running,
	})
}

func OpenCodeWeb(c *echo.Context) error {
	// checking if opencode is configured
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, OpenCodeWebResponse{
			Message: fmt.Sprintf("failed to load config: %v", err),
			Running: openCodeWebServer.running,
		})
	}

	if cfg.OpenCode == nil {
		return c.JSON(http.StatusBadRequest, OpenCodeWebResponse{
			Message: "Opencode is not configured",
			Running: openCodeWebServer.running,
		})
	}
	var body OpenCodeWebBody

	if err := c.Bind(&body); err != nil {
		fmt.Println("Error binding:", err)
		return c.JSON(http.StatusBadRequest, OpenCodeWebResponse{
			Message: "bad request",
			Running: openCodeWebServer.running,
		})
	}

	switch body.Action {

	case "start":
		if openCodeWebServer.running {
			return c.JSON(http.StatusOK, OpenCodeWebResponse{
				Message: fmt.Sprintf("Web is already running at port: %d", openCodeWebServer.port),
				Running: true,
			})
		}

		// Prepare the command
		openCodeWebServer.cmd = exec.Command(
			"bash",
			"-c",
			"/home/ubuntu/.opencode/bin/opencode serve --port 4096 --hostname 0.0.0.0",
		)

		go func() {
			openCodeWebServer.running = true
			err := openCodeWebServer.cmd.Run()
			if err != nil {
				fmt.Println("Opencode server stopped with error:", err)
			}
			openCodeWebServer.running = false
		}()

		time.Sleep(3 * time.Second)

		return c.JSON(http.StatusOK, OpenCodeWebResponse{
			Message: fmt.Sprintf("Opencode web server is starting at port %d", openCodeWebServer.port),
			Running: true,
		})

	case "terminate":
		if !openCodeWebServer.running || openCodeWebServer.cmd == nil || openCodeWebServer.cmd.Process == nil {
			return c.JSON(http.StatusOK, OpenCodeWebResponse{
				Message: "Server is not currently running.",
				Running: false,
			})
		}

		err := openCodeWebServer.cmd.Process.Kill()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, OpenCodeWebResponse{
				Message: fmt.Sprintf("Failed to terminate server: %v", err),
				Running: openCodeWebServer.running,
			})
		}

		return c.JSON(http.StatusOK, OpenCodeWebResponse{
			Message: "Opencode web server terminated successfully.",
			Running: false,
		})

	case "status":
		return c.JSON(http.StatusOK, OpenCodeWebResponse{
			Message: "Opencode web server status fetched successfully.",
			Running: openCodeWebServer.running,
		})
	default:
		return c.JSON(http.StatusBadRequest, OpenCodeWebResponse{
			Message: fmt.Sprintf("only start, terminate, and status actions are valid and you sent '%s'", body.Action),
			Running: openCodeWebServer.running,
		})
	}
}
