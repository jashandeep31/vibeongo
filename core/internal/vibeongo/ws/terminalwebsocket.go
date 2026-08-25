package ws

import (
	"log"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v5"
)

type TerminalSession struct {
	ID        string
	Buffer    []byte
	Ptmx      *os.File
	Mu        sync.Mutex
	CreatedAt time.Time
}

func TerminalWebSocket() echo.HandlerFunc {
	return func(c *echo.Context) error {

		var writeMu sync.Mutex

		slug := c.Param("slug")
		// making the slug default to the new
		if slug == "" {
			slug = "new"
		}

		conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}
		defer conn.Close()

		// testing Context
		baseCommand := exec.Command("bash")

		ptmx, err := pty.StartWithSize(baseCommand, &pty.Winsize{Rows: 40, Cols: 90})
		// ptmx, err := pty.Start(baseCommand)
		if err != nil {
			return err
		}

		// this may get removed
		defer func() { _ = ptmx.Close() }()

		go func() {
			buf := make([]byte, 32*1024)

			for {
				n, err := ptmx.Read(buf)

				if n > 0 {
					writeMu.Lock()
					writeErr := conn.WriteMessage(
						websocket.BinaryMessage,
						buf[:n],
					)
					writeMu.Unlock()

					if writeErr != nil {
						return
					}
				}

				if err != nil {
					return
				}
			}
		}()

		for {
			messageType, msg, err := conn.ReadMessage()
			if err != nil {
				log.Println("Read failed:", err)
				break
			}
			log.Printf("Received: %s", msg)

			if messageType != websocket.TextMessage &&
				messageType != websocket.BinaryMessage {
				continue
			}

			if _, err := ptmx.Write(msg); err != nil {
				return nil
			}
		}
		return nil
	}
}
