package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	wsfunctions "github.com/jashandeep31/vibeongo/core/internal/ws/ws_functions"
	"github.com/labstack/echo/v5"
)

type sizeData struct {
	Rows uint16 `json:"rows"`
	Cols uint16 `json:"cols"`
}

type SsMessage struct {
	Type string   `json:"type"`
	Data sizeData `json:"data"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

const (
	defaultRows = 40
	defaultCols = 155
	ptyBufSize  = 4096
)

func WebSocket(c *echo.Context) error {
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithCancel(c.Request().Context())
	defer cancel()

	var writeMu sync.Mutex

	go wsfunctions.StatsHandler(ctx, conn, &writeMu)

	cmd := exec.Command("bash", "-l")
	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: defaultRows, Cols: defaultCols})
	if err != nil {
		writeMu.Lock()
		_ = conn.WriteMessage(websocket.TextMessage, []byte("Failed to start terminal session\n"))
		writeMu.Unlock()
		return err
	}
	defer func() {
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		_ = ptmx.Close()
	}()

	go pipePTYToWebSocket(conn, ptmx, &writeMu)

	return pipeWebSocketToPTY(conn, ptmx)
}

func pipePTYToWebSocket(conn *websocket.Conn, ptmx *os.File, writeMu *sync.Mutex) {
	buf := make([]byte, ptyBufSize)
	for {
		n, err := ptmx.Read(buf)
		if err != nil {
			if err != io.EOF {
				fmt.Printf("pty read error: %v\n", err)
			}
			return
		}
		writeMu.Lock()
		writeErr := conn.WriteMessage(websocket.BinaryMessage, buf[:n])
		writeMu.Unlock()
		if writeErr != nil {
			return
		}
	}
}

func pipeWebSocketToPTY(conn *websocket.Conn, ptmx *os.File) error {
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}

		var m SsMessage
		if err := json.Unmarshal(msg, &m); err != nil || m.Type == "" {
			// Not a JSON control message — raw terminal input, write directly
			if _, err := ptmx.Write(msg); err != nil {
				return err
			}
			continue
		}
		switch m.Type {
		case "size":
			if err := pty.Setsize(ptmx, &pty.Winsize{
				Rows: m.Data.Rows,
				Cols: m.Data.Cols,
			}); err != nil {
				fmt.Printf("failed to resize pty: %v\n", err)
			}
		default:
			fmt.Printf("Unknown message type: %s\n", m.Type)
		}
	}
}
