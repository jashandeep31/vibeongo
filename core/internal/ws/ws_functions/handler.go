package wsfunctions

import (
	"context"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func HandleConnection(ctx context.Context, conn *websocket.Conn, terminalStore *store.SessionStore) error {
	var writeMu sync.Mutex

	session, err := terminalStore.GetOrCreateSession()
	if err != nil {
		return err
	}

	if err := StartPTY(session); err != nil {
		writeMu.Lock()
		_ = conn.WriteMessage(websocket.TextMessage, []byte("Failed to start terminal session\n"))
		writeMu.Unlock()
		return err
	}

	session.Mu.Lock()
	if len(session.Buffer) > 0 {
		writeMu.Lock()
		_ = conn.WriteMessage(websocket.BinaryMessage, session.Buffer)
		writeMu.Unlock()
	}
	session.Mu.Unlock()

	go PipePTYToWebSocket(conn, &writeMu, session)

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}

		StoreWsHandler(ctx, conn, &writeMu, msg, terminalStore)

		_ = HandlePTYInput(session, msg)
	}
}
