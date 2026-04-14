package handlers

import (
	"net/http"
	"os/exec"
	"time"

	"github.com/labstack/echo/v5"
)

func RebootServer(c *echo.Context) error {
	go func() {
		time.Sleep(2 * time.Second)
		cmd := exec.Command("sudo", "reboot")
		cmd.Run()
		// fmt.Println("rebooting the server")
	}()
	return c.JSON(http.StatusOK, struct {
		Message string `json:"messge"`
	}{
		Message: "Server is getting restarted in 2sec",
	})
}
