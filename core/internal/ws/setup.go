package ws

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v5"
)

type sizeData struct {
	Rows uint16 `json:"rows"` // Must be exported for json.Unmarshal
	Cols uint16 `json:"cols"` // Using uint16 directly since pty.Winsize expects it
}

type wsMessage struct {
	Type string   `json:"type"`
	Data sizeData `json:"data"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // WARN: Disable in production
	},
}

func WebSocket(c *echo.Context) error { // Note: echo.Context not *echo.Context
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	cmd := exec.Command("bash", "-l")
	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: 40, Cols: 155})
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Failed to start terminal session\n"))
		return err
	}
	fmt.Println("Terminal started")
	defer func() {
		fmt.Println("Terminal closed")
		cmd.Process.Kill() // Kill the process, not just close the pty
		ptmx.Close()
	}()

	// pty → websocket
	go func() {
		buf := make([]byte, 4096) // Larger buffer for smoother output
		for {
			n, err := ptmx.Read(buf)
			if err != nil {
				return
			}
			if err := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
				return
			}
		}
	}()

	// websocket → pty
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}

		var m wsMessage
		if err := json.Unmarshal(msg, &m); err != nil || m.Type == "" {
			// Not a JSON control message — raw terminal input, write directly
			if _, err := ptmx.Write(msg); err != nil {
				return err
			}
			continue
		}

		switch m.Type {
		case "size":
			fmt.Println(m.Data)
			pty.Setsize(ptmx, &pty.Winsize{
				Rows: m.Data.Rows,
				Cols: m.Data.Cols,
			})
		default:
			fmt.Printf("Unknown message type: %s\n", m.Type)
		}
	}
}
