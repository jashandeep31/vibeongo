package ws

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
	wsfunctions "github.com/jashandeep31/vibeongo/core/internal/ws/ws_functions"
	"github.com/labstack/echo/v5"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var TerminalStore = store.NewSessionStore()

func WebSocket(c *echo.Context) error {
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	return wsfunctions.HandleConnection(c.Request().Context(), conn, TerminalStore)
}

