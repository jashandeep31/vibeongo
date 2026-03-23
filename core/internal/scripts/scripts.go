package scripts

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

func WriteScripts() {
	fmt.Println("writing hte on1")
	writeApiServerUpdateScript()
}

const basePath = "/home/ubuntu/vibeongo"

func writeApiServerUpdateScript() {
	err := os.MkdirAll(basePath, os.ModePerm)
	if err != nil {
		log.Fatal(err)
	}
	scriptData := `
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

echo "✅ Update completed successfully"
`
	bashFilePath := filepath.Join(basePath, "/update.sh")

	err = os.WriteFile(bashFilePath, []byte(scriptData), 0644)
	if err != nil {
		log.Fatal(err)
	}
	cmd := exec.Command("sudo", "chmod", "+x", bashFilePath)
	cmd.Run()
}
