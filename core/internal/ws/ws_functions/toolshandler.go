package wsfunctions

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func ToolsHandler(ctx context.Context, conn *websocket.Conn, writeMu *sync.Mutex, msg []byte, tools *store.Tools) (bool, error) {

	// basic parsing to check the message is for this function or not
	var parsedBaseMesasge struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}

	err := json.Unmarshal(msg, &parsedBaseMesasge)
	if err != nil {
		return false, nil
	}

	// if message is not for the tools that just return it
	if parsedBaseMesasge.Type != "tool" {
		return false, nil
	}

	// proper parsing with the tool and the action required
	var parsedData struct {
		Tool   string `json:"tool"`
		Action string `json:"action"`
	}
	if err := json.Unmarshal(parsedBaseMesasge.Data, &parsedData); err != nil {
		return true, nil
	}

	// switch between the tools
	switch parsedData.Tool {
	case "opencode":
		if err := openCodeHanler(tools.OpenCode, parsedData.Action); err != nil {
			return true, writeToolError(conn, writeMu, "opencode", tools.OpenCode.IsRunning(), err)
		}
		return true, writeToolStatus(conn, writeMu, "opencode", tools.OpenCode.IsRunning())

	case "codex", "t3Code":
		if err := t3CodeHandler(tools.T3Code, parsedData.Action); err != nil {
			return true, writeToolError(conn, writeMu, "codex", tools.T3Code.Status(), err)
		}
		return true, writeToolStatus(conn, writeMu, "codex", tools.T3Code.Status())
	}

	return true, nil
}

func writeToolStatus(conn *websocket.Conn, writeMu *sync.Mutex, tool string, status bool) error {
	writeMu.Lock()
	defer writeMu.Unlock()

	return conn.WriteJSON(struct {
		Type string `json:"type"`
		Data struct {
			Tool   string `json:"tool"`
			Status bool   `json:"status"`
		} `json:"data"`
	}{
		Type: "tool",
		Data: struct {
			Tool   string `json:"tool"`
			Status bool   `json:"status"`
		}{
			Tool:   tool,
			Status: status,
		},
	})
}

func writeToolError(conn *websocket.Conn, writeMu *sync.Mutex, tool string, status bool, err error) error {
	writeMu.Lock()
	defer writeMu.Unlock()

	return conn.WriteJSON(struct {
		Type string `json:"type"`
		Data struct {
			Tool   string `json:"tool"`
			Status bool   `json:"status"`
			Error  string `json:"error"`
		} `json:"data"`
	}{
		Type: "tool",
		Data: struct {
			Tool   string `json:"tool"`
			Status bool   `json:"status"`
			Error  string `json:"error"`
		}{
			Tool:   tool,
			Status: status,
			Error:  err.Error(),
		},
	})
}

func openCodeHanler(opencode *store.OpencodeWeb, action string) error {
	switch action {
	case "start":
		return opencode.StartWebServer()

	case "stop":
		return opencode.StopWebServer()

	case "restart":
		return opencode.RestartWebServer()

	case "status":
		return nil

	}

	return nil
}

func t3CodeHandler(t3Code *store.T3Code, action string) error {
	switch action {
	case "start":
		return t3Code.StartT3Code()

	case "stop":
		return t3Code.StopT3Code()

	case "restart":
		return t3Code.RestartT3Code()

	case "status":
		return nil
	}

	return nil
}
