package wsfunctions

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func HandleConnection(ctx context.Context, conn *websocket.Conn, terminalStore *store.SessionStore, tools *store.Tools) error {
	// create the mutex to make sure only one is sending the resposne at a time
	var writeMu sync.Mutex
	var activeMu sync.RWMutex
	pipedSessions := make(map[string]struct{})
	// unsubscribe the sessions at the end of function
	unsubscribeSessions := []func(){}
	defer func() {
		for _, unsubscribe := range unsubscribeSessions {
			unsubscribe()
		}
	}()

	// create the session to the terminal
	session, err := terminalStore.GetOrCreateSession()
	if err != nil {
		return err
	}
	activeSession := session

	// function to set the active session
	setActiveSession := func(session *store.TerminalSession) {
		activeMu.Lock()
		activeSession = session
		activeMu.Unlock()
	}

	// return the active session
	getActiveSession := func() *store.TerminalSession {
		activeMu.RLock()
		defer activeMu.RUnlock()
		return activeSession
	}

	// check for sessionid whether its active or not
	isActiveSession := func(sessionID string) bool {
		activeMu.RLock()
		defer activeMu.RUnlock()
		return activeSession != nil && activeSession.ID == sessionID
	}

	// pipesessions -> pipe the pty  output to the websocket so frontend can receive the output
	pipeSession := func(session *store.TerminalSession) {
		if _, ok := pipedSessions[session.ID]; ok {
			return
		}
		pipedSessions[session.ID] = struct{}{}
		unsubscribeSessions = append(unsubscribeSessions, PipePTYToWebSocket(conn, &writeMu, session, isActiveSession))
	}

	// add the ptmx  to the session if not present
	if err := StartPTY(session); err != nil {
		_ = WriteTerminalMessage(conn, &writeMu, []byte("Failed to start terminal session\n"))
		return err
	}

	if err := waitForClientReady(conn); err != nil {
		return err
	}

	errorSender := wsErrorSender(conn, &writeMu)

	go StatsHandler(ctx, conn, &writeMu)
	go LogsHandler(ctx, conn, &writeMu)

	// send the sessions list to the frontend client
	SendSessions(conn, terminalStore, &writeMu)
	if err := SendPtyUpdate(session, conn, &writeMu); err != nil {
		return err
	}

	// write the buffer of the pty the terminal that is geting used to the websocket to frontend can render all data
	WritePTYBufferToWebSocket(conn, &writeMu, session)

	// pipe the pty to the websocket meand sending the output of the pty/terminal to hte websocket
	pipeSession(session)
	// handling all the messages
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}

		type baseMessageType struct {
			Type string          `json:"type"`
			Data json.RawMessage `json:"data"`
		}

		var baseMessage *baseMessageType

		if err := json.Unmarshal(msg, &baseMessage); err != nil {
			continue
		}

		switch baseMessage.Type {
		case "tool":
			_, err := ToolsHandler(ctx, conn, &writeMu, []byte(baseMessage.Data), tools, errorSender)
			if err != nil {
				errorSender(err.Error())
				return nil
			}
		case "shelltools":
			_, err = ShellToolsHandler(ctx, conn, &writeMu, []byte(baseMessage.Data), errorSender)
			if err != nil {
				return err
			}
		default:
			// storehandler-> hanling things: switch the terminal session, add new terminal session
			selectedSession, handled, err := StoreWsHandler(conn, &writeMu, msg, terminalStore)
			if err != nil {
				return err
			}
			if selectedSession != nil {
				setActiveSession(selectedSession)
				if err := StartPTY(selectedSession); err != nil {
					_ = WriteTerminalMessage(conn, &writeMu, []byte("Failed to start terminal session\n"))
					return err
				}
				if err := SendPtyUpdate(selectedSession, conn, &writeMu); err != nil {
					return err
				}
				WritePTYBufferToWebSocket(conn, &writeMu, selectedSession)
				pipeSession(selectedSession)
			}
			if handled {
				continue
			}

			_ = HandlePTYInput(getActiveSession(), msg)
		}
	}
}

func waitForClientReady(conn *websocket.Conn) error {
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}

		var parsed struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(msg, &parsed); err != nil {
			continue
		}
		if parsed.Type == "clientReady" {
			return nil
		}
	}
}

func wsErrorSender(conn *websocket.Conn, writeMu *sync.Mutex) func(message string) {
	return func(message string) {

		writeMu.Lock()
		defer writeMu.Unlock()

		type Data struct {
			Error string `json:"error"`
		}
		_ = conn.WriteJSON(struct {
			Type string `json:"type"`
			Data Data   `json:"data"`
		}{
			Type: "error",
			Data: Data{Error: message},
		})
	}
}
