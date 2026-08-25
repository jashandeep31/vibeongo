package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store/newstores"
	"github.com/labstack/echo/v5"
)

type terminalControlMessage struct {
	Type      string `json:"type"`
	ID        string `json:"id,omitempty"`
	Cols      int    `json:"cols,omitempty"`
	Rows      int    `json:"rows,omitempty"`
	SentAt    int64  `json:"sentAt,omitempty"`
	HasBuffer bool   `json:"hasBuffer,omitempty"`
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

		// ID connects to a stored terminal session; "new" creates one.
		id := c.Param("id")
		if id == "" {
			id = "new"
		}

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
		buffer, output, unsubscribe := terminalSession.Subscribe()
		defer unsubscribe()

		if err := writeTerminalControl(conn, &writeMu, terminalControlMessage{
			Type:      "session",
			ID:        terminalSession.ID,
			HasBuffer: len(buffer) > 0,
		}); err != nil {
			return nil
		}
		if len(buffer) > 0 {
			if err := writeTerminalOutput(conn, &writeMu, buffer); err != nil {
				return nil
			}
		}

		go func() {
			for data := range output {
				if err := writeTerminalOutput(conn, &writeMu, data); err != nil {
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
					err := writeTerminalControl(conn, &writeMu, terminalControlMessage{
						Type:   "pong",
						SentAt: control.SentAt,
					})
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

func writeTerminalControl(conn *websocket.Conn, writeMu *sync.Mutex, message terminalControlMessage) error {
	payload, err := json.Marshal(message)
	if err != nil {
		return err
	}

	writeMu.Lock()
	defer writeMu.Unlock()
	return conn.WriteMessage(websocket.TextMessage, payload)
}

func writeTerminalOutput(conn *websocket.Conn, writeMu *sync.Mutex, output []byte) error {
	writeMu.Lock()
	defer writeMu.Unlock()
	return conn.WriteMessage(websocket.BinaryMessage, output)
}
