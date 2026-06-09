package wsfunctions

import (
	"context"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func LogsHandler(ctx context.Context, conn *websocket.Conn, writeMu *sync.Mutex) {
	logT := time.NewTicker(2 * time.Second)
	defer logT.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-logT.C:
			content, err := os.ReadFile("/var/log/user-data.json")
			if err != nil {
				content = []byte("Hi how are you")
			}

			message := struct {
				Type string `json:"type"`
				Data string `json:"data"`
			}{
				Type: "logs",
				Data: string(content),
			}

			writeMu.Lock()
			writeErr := conn.WriteJSON(message)
			writeMu.Unlock()
			if writeErr != nil {
				return
			}
		}
	}
}
