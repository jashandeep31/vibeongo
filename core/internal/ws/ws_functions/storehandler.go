package wsfunctions

import (
	"context"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func StoreWsHandler(ctx context.Context, c *websocket.Conn, writeMu *sync.Mutex, msg []byte, terminalStore *store.SessionStore) {
	sessions := terminalStore.GetSessions()

	fmt.Println(string(msg))
	sessionIds := []string{}
	for id := range sessions {
		sessionIds = append(sessionIds, id)
	}

	c.WriteJSON(struct {
		Type     string   `json:"type"`
		Ids      []string `json:"ids"`
		ActiveId string   `json:"activeId"`
	}{
		Type:     "sessionIds",
		Ids:      sessionIds,
		ActiveId: terminalStore.ActiveId,
	})

	fmt.Println(string(msg))
}
