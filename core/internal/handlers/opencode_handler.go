package handlers

import (
	"fmt"
	"net/http"
	"os/exec"

	"github.com/labstack/echo/v5"
)

func LaunchOpenCodeWeb(c *echo.Context) error {
	cmd := exec.Command("opencode", "serve")
	out, err := cmd.CombinedOutput()
	fmt.Println(string(out), err)

	return c.JSON(http.StatusOK, struct {
		Message string `json:"message"`
	}{
		Message: "opencode section launch",
	})
}
