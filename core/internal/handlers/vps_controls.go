package handlers

import (
	"fmt"
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

func UpdateApiServer(c *echo.Context) error {
	go func() {
		fmt.Println("things are running in the background")
		cmd := exec.Command("sudo", "bash", "-c", `
set -e

USER_HOME="/home/ubuntu"
BIN="$USER_HOME/server"
NEW="$USER_HOME/server.new"

echo "[1/5] Downloading new binary..."
curl -fL https://l1.devsradar.com/install-api -o "$NEW"

echo "[2/5] Making it executable..."
chmod +x "$NEW"

echo "[3/5] Stopping service..."
systemctl stop myserver

echo "[4/5] Replacing binary..."
mv -f "$NEW" "$BIN"

echo "[5/5] Starting service..."
systemctl start myserver

echo "Update completed successfully"
`)

		err := cmd.Run()
		fmt.Println(err)
	}()
	return c.JSON(http.StatusOK, struct {
		Message string `json:"message"`
	}{
		Message: "Updating the server please send requests late",
	})
}
