package ws

import (
	"context"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
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

func WebSocket(c *echo.Context) error {
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithCancel(c.Request().Context())
	defer cancel()

	var writeMu sync.Mutex

	// function to send the stats to the web ui
	go wsfunctions.StatsHandler(ctx, conn, &writeMu)

	// function to serve the terminal
	return wsfunctions.PtyHandler(conn, &writeMu)
}
