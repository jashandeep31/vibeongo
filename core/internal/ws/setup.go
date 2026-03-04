package ws

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v5"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // WARN: Please disable this in the production
	},
}

func WebSocket(c *echo.Context) error {
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	for {

		msgType, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if err := conn.WriteMessage(msgType, msg); err != nil {
			break
		}
	}

	defer conn.Close()
	return nil
}
