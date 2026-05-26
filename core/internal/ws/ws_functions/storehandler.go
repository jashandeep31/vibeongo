package wsfunctions

import (
	"encoding/json"
	"os"
	"sort"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func StoreWsHandler(c *websocket.Conn, writeMu *sync.Mutex, msg []byte, store *store.SessionStore) (*store.TerminalSession, bool, error) {
	var parsedBaseMesasge struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}
	err := json.Unmarshal(msg, &parsedBaseMesasge)
	if err == nil {
		switch parsedBaseMesasge.Type {
		case "switchSession":
			var parsedData struct {
				SessionId string `json:"sessionId"`
			}

			err := json.Unmarshal(parsedBaseMesasge.Data, &parsedData)
			if err != nil {
				return nil, true, err
			}
			if err := store.SwitchSession(parsedData.SessionId); err != nil {
				return nil, true, err
			}
			session, ok := store.GetSession(parsedData.SessionId)
			if !ok {
				return nil, true, os.ErrNotExist
			}
			SendSessions(c, store, writeMu)
			return session, true, nil

		case "newSession":
			session, err := store.CreateSession()
			if err != nil {
				return nil, true, err
			}
			SendSessions(c, store, writeMu)
			return session, true, nil
		}
	}
	return nil, false, nil
}

func SendPtyUpdate(session *store.TerminalSession, conn *websocket.Conn, writeMu *sync.Mutex) error {
	writeMu.Lock()
	err := conn.WriteJSON(struct {
		Type      string `json:"type"`
		SessionId string `json:"sessionId"`
		HasBuffer bool   `json:"hasBuffer"`
	}{
		Type:      "ptyUpdate",
		SessionId: session.ID,
		HasBuffer: session.HasBuffer(),
	})
	writeMu.Unlock()
	if err != nil {
		return err
	}

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
		ActiveId: store.GetActiveID(),
	})
}
