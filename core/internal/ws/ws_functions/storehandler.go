package wsfunctions

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func StoreWsHandler(ctx context.Context, c *websocket.Conn, writeMu *sync.Mutex, msg []byte, store *store.SessionStore) {
	var parsedBaseMesasge struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}
	err := json.Unmarshal(msg, &parsedBaseMesasge)
	fmt.Println(parsedBaseMesasge)
	if err == nil {
		switch parsedBaseMesasge.Type {
		case "switchSession":
			var parsedData struct {
				SessionId string `json:"sessionId"`
			}

			err := json.Unmarshal(parsedBaseMesasge.Data, &parsedData)
			if err != nil {
				return
			}
			fmt.Println(parsedData.SessionId, "parsed id")
			store.SwitchSession(parsedData.SessionId)
			SendSessions(c, store, writeMu)
			UpdatePty(store, c, writeMu, msg)

		case "newSession":
			store.CreateSession()
			fmt.Println(store.ActiveId)
			SendSessions(c, store, writeMu)
			fmt.Println(store.ActiveId)
			UpdatePty(store, c, writeMu, msg)
		}
	}
}

func UpdatePty(store *store.SessionStore, conn *websocket.Conn, writeMu *sync.Mutex, msg []byte) error {
	writeMu.Lock()
	defer writeMu.Unlock()
	conn.WriteJSON(struct {
		Type string `json:"type"`
	}{
		Type: "ptyUpdate",
	})
	session, _ := store.GetSession(store.ActiveId)
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

func SendSessions(c *websocket.Conn, store *store.SessionStore, writeMu *sync.Mutex) {
	sessions := store.GetSessions()
	sessionIds := []string{}
	for id := range sessions {
		sessionIds = append(sessionIds, id)
	}
	sort.Slice(sessionIds, func(i, j int) bool {
		return sessions[sessionIds[i]].CreatedAt.Before(sessions[sessionIds[j]].CreatedAt)
	})

	writeMu.Lock()
	defer writeMu.Unlock()

	c.WriteJSON(struct {
		Type     string   `json:"type"`
		Ids      []string `json:"ids"`
		ActiveId string   `json:"activeId"`
	}{
		Type:     "sessionIds",
		Ids:      sessionIds,
		ActiveId: store.ActiveId,
	})
	fmt.Println(store.ActiveId)
}
