package wsfunctions

import (
	"context"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func HandleConnection(ctx context.Context, conn *websocket.Conn, terminalStore *store.SessionStore) error {
	// create the mutex to make sure only one is sending the resposne at a time
	var writeMu sync.Mutex

	// create the session to the terminal
	session, err := terminalStore.GetOrCreateSession()
	if err != nil {
		return err
	}

	// add the ptmx  to the session if not present
	if err := intializeAndSendPtySession(session, conn, &writeMu); err != nil {
		return err
	}

	// pipe the pty to the websocket meand sending the output of the pty/terminal to hte websocket
	go PipePTYToWebSocket(conn, &writeMu, session)

	SendSessions(conn, terminalStore, &writeMu)
	// handling all the messages
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}

		StoreWsHandler(ctx, conn, &writeMu, msg, terminalStore)

		_ = HandlePTYInput(session, msg)
	}
}

func intializeAndSendPtySession(session *store.TerminalSession, conn *websocket.Conn, writeMu *sync.Mutex) error {
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
	return nil
}
