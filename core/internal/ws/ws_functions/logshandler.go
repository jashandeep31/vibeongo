package wsfunctions

import (
	"bytes"
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
			content, err := os.ReadFile("/home/ubuntu/.logs/user-data.log")
			if err != nil {
				content = []byte("Hi how are you")
			}
			// Clean carriage returns from progress-bar style output
			cleaned := bytes.ReplaceAll(content, []byte("\r\n"), []byte("\n"))
			cleaned = bytes.ReplaceAll(cleaned, []byte("\r"), []byte("\n"))

			message := struct {
				Type string `json:"type"`
				Data string `json:"data"`
			}{
				Type: "logs",
				Data: string(cleaned),
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
