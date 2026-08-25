package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store/newstores"
	"github.com/labstack/echo/v5"
)

type terminalControlMessage struct {
	Type   string `json:"type"`
	Cols   int    `json:"cols"`
	Rows   int    `json:"rows"`
	SentAt int64  `json:"sentAt"`
}

func TerminalWebSocket(tools *store.Tools) echo.HandlerFunc {
	return func(c *echo.Context) error {

		sessionsStore := tools.TerminalSessionStore

		// making a http request to websocket connection
		conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}
		defer conn.Close()
		var writeMu sync.Mutex

		// slug to connect to a particular terminal session and new for adding the new session
		id := c.Param("id")
		fmt.Println("id", id)
		// making the slug default to the new
		if id == "" {
			id = "new"
		}

		// NOTE: this fuction is not prroper way
		terminalSession, err := func() (*newstores.TerminalSession, error) {
			if id == "new" {
				terminalSession, err := sessionsStore.CreateTerminalSession()
				if err != nil {
					return nil, err
				}
				return terminalSession, nil
			} else {
				terminalSession, err := sessionsStore.GetTerminalSession(id)
				return terminalSession, err
			}
		}()
		if err != nil {
			return err
		}

		ptmx := terminalSession.Ptmx

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
			switch messageType {
			case websocket.TextMessage:
				var control terminalControlMessage
				if err := json.Unmarshal(msg, &control); err != nil {
					continue
				}

				switch control.Type {
				case "resize":
					if control.Cols > 0 && control.Cols <= 65535 &&
						control.Rows > 0 && control.Rows <= 65535 {
						if err := pty.Setsize(ptmx, &pty.Winsize{
							Cols: uint16(control.Cols),
							Rows: uint16(control.Rows),
						}); err != nil {
							log.Printf("PTY resize failed: %v", err)
						}
					}
				case "ping":
					pong, err := json.Marshal(terminalControlMessage{
						Type:   "pong",
						SentAt: control.SentAt,
					})
					if err != nil {
						continue
					}

					writeMu.Lock()
					err = conn.WriteMessage(websocket.TextMessage, pong)
					writeMu.Unlock()
					if err != nil {
						return nil
					}
				}
			case websocket.BinaryMessage:
				if _, err := ptmx.Write(msg); err != nil {
					return nil
				}
			}
		}
		return nil
	}
}
