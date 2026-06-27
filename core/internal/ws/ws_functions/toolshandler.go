package wsfunctions

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func ToolsHandler(ctx context.Context, conn *websocket.Conn, writeMu *sync.Mutex, msg []byte, tools *store.Tools) (bool, error) {

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
		Tool   string `json:"tool"`
		Action string `json:"action"`
	}
	if err := json.Unmarshal(parsedBaseMesasge.Data, &parsedData); err != nil {
		return true, nil
	}

	if parsedData.Tool == "opencode" {
		openCodeHanler(tools.OpenCode, parsedData.Action)
		conn.WriteJSON(struct {
			Type string          `json:"type"`
			Data json.RawMessage `json:"data"`
		}{
			Type: "opencode",
			Data: parsedBaseMesasge.Data,
		})
	}

	if parsedData.Tool == "t3Code" {
		t3CodeHandler(tools.T3Code, parsedData.Action)
	}

	return false, nil
}

func openCodeHanler(opencode *store.OpencodeWeb, action string) {
	switch action {
	case "start":
		_ = opencode.StartWebServer()

	case "stop":
		_ = opencode.StopWebServer()

	case "restart":
		_ = opencode.RestartWebServer()

	case "status":
		_ = opencode.IsRunning()

	}
}

func t3CodeHandler(t3Code *store.T3Code, action string) {
	switch action {
	case "start":
		_ = t3Code.StartT3Code()

	case "stop":
		_ = t3Code.StopT3Code()

	case "retart":
		_ = t3Code.RestartT3Code()

	case "status":
		_ = t3Code.Status()
	}

}
