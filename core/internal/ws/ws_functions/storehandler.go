package wsfunctions

import (
	"context"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
)

func StoreWsHandler(ctx context.Context, c *websocket.Conn, writeMu *sync.Mutex) {
	var data interface{}
	c.ReadJSON(&data)
	fmt.Println(data)
}
