package wsfunctions

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

type Msg struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

func writeOpencodeWebStatus(conn *websocket.Conn, writeMu *sync.Mutex, state string) error {
	writeMu.Lock()
	defer writeMu.Unlock()

	return conn.WriteJSON(Msg{
		Type: "opencode",
		Data: map[string]any{
			"state": state,
		},
	})
}

func writeOpencodeWebError(conn *websocket.Conn, writeMu *sync.Mutex, state string, err error) error {
	writeMu.Lock()
	defer writeMu.Unlock()

	return conn.WriteJSON(Msg{
		Type: "opencode",
		Data: map[string]any{
			"state": state,
			"error": err.Error(),
		},
	})
}

func opencodeWebState(opencodeWeb *store.OpencodeWeb) string {
	if opencodeWeb.IsRunning() {
		return "started"
	}

	return "stopped"
}

// OpencodewebHandler handle the opencode web things
func OpencodewebHandler(ctx context.Context, conn *websocket.Conn, writeMu *sync.Mutex, msg []byte, opencodeWeb *store.OpencodeWeb) (bool, error) {
	var parsedBaseMesasge struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}

	err := json.Unmarshal(msg, &parsedBaseMesasge)
	if err != nil {
		return false, nil
	}

	if parsedBaseMesasge.Type != "opencode" {
		return false, nil
	}

	var parsedData struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(parsedBaseMesasge.Data, &parsedData); err != nil {
		return true, nil
	}

	switch parsedData.Action {
	case "status":
		return true, writeOpencodeWebStatus(conn, writeMu, opencodeWebState(opencodeWeb))

	case "start":
		if err := opencodeWeb.StartWebServer(); err != nil {
			return true, writeOpencodeWebError(conn, writeMu, opencodeWebState(opencodeWeb), err)
		}
		return true, writeOpencodeWebStatus(conn, writeMu, opencodeWebState(opencodeWeb))

	case "restart":
		if err := opencodeWeb.RestartWebServer(); err != nil {
			return true, writeOpencodeWebError(conn, writeMu, opencodeWebState(opencodeWeb), err)
		}
		return true, writeOpencodeWebStatus(conn, writeMu, opencodeWebState(opencodeWeb))

	case "stop":
		if err := opencodeWeb.StopWebServer(); err != nil {
			return true, writeOpencodeWebError(conn, writeMu, opencodeWebState(opencodeWeb), err)
		}
		return true, writeOpencodeWebStatus(conn, writeMu, opencodeWebState(opencodeWeb))
	}

	return true, nil
}
