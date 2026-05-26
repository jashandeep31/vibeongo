package wsfunctions

import (
	"context"
	"sync"

	"github.com/gorilla/websocket"
)

func StoreWsHandler(ctx context.Context, c *websocket.Conn, writeMu *sync.Mutex, msg []byte) {
}
