package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

type terminalControlMessage struct {
	Type  string `json:"type"`
	Error string `json:"error,omitempty"`
	Cols  uint32 `json:"cols,omitempty"`
	Rows  uint32 `json:"rows,omitempty"`
}

type ptyRequest struct {
	Term     string
	Width    uint32
	Height   uint32
	WidthPx  uint32
	HeightPx uint32
	Modes    string
}

type windowChangeRequest struct {
	Width    uint32
	Height   uint32
	WidthPx  uint32
	HeightPx uint32
}

func handleSession(channel ssh.Channel, requests <-chan *ssh.Request, grant terminalGrant) {
	defer channel.Close()

	ws, err := connectToTerminal(grant)
	if err != nil {
		_, _ = io.WriteString(channel.Stderr(), "Could not open the workspace terminal. Create a new SSH command and try again.\r\n")
		finishSSHSession(channel, 1)
		log.Printf("SSH terminal connection failed: %v", err)
		return
	}
	defer ws.Close()

	var writeMu sync.Mutex
	shellReady := make(chan bool, 1)
	go handleSSHRequests(requests, ws, &writeMu, shellReady)
	select {
	case ready := <-shellReady:
		if !ready {
			return
		}
	case <-time.After(10 * time.Second):
		_, _ = io.WriteString(channel.Stderr(), "Timed out waiting for an SSH shell request.\r\n")
		finishSSHSession(channel, 1)
		return
	}

	ended := make(chan error, 2)
	go func() {
		buffer := make([]byte, 32*1024)
		for {
			n, err := channel.Read(buffer)
			if err != nil {
				ended <- err
				return
			}
			if n > 0 {
				writeMu.Lock()
				err = ws.WriteMessage(websocket.BinaryMessage, buffer[:n])
				writeMu.Unlock()
				if err != nil {
					ended <- err
					return
				}
			}
		}
	}()
	go func() {
		for {
			messageType, message, err := ws.ReadMessage()
			if err != nil {
				ended <- err
				return
			}
			switch messageType {
			case websocket.BinaryMessage:
				if err := writeAll(channel, message); err != nil {
					ended <- err
					return
				}
			case websocket.TextMessage:
				var control terminalControlMessage
				if json.Unmarshal(message, &control) == nil {
					switch control.Type {
					case "exit":
						ended <- io.EOF
						return
					case "error":
						ended <- errors.New("runtime terminal reported an error")
						return
					}
				}
			}
		}
	}()

	err = <-ended
	_ = ws.Close()
	status := uint32(0)
	if err != nil && !errors.Is(err, io.EOF) {
		status = 1
	}
	finishSSHSession(channel, status)
}

func finishSSHSession(channel ssh.Channel, status uint32) {
	_, _ = channel.SendRequest("exit-status", false, ssh.Marshal(struct{ Status uint32 }{status}))
	_ = channel.CloseWrite()
}

func connectToTerminal(grant terminalGrant) (*websocket.Conn, error) {
	if !time.Now().Before(grant.ExpiresAt) {
		return nil, errors.New("terminal grant expired")
	}
	endpoint, err := url.Parse(grant.WebsocketURL)
	if err != nil || endpoint.Scheme != "wss" || endpoint.Host == "" || endpoint.User != nil || endpoint.RawQuery != "" || endpoint.Path != "/v2/ws/terminal/new" {
		return nil, errors.New("invalid terminal WebSocket URL")
	}
	query := endpoint.Query()
	query.Set("proxytoken", grant.ProxyToken)
	query.Set("vibeongoToken", grant.RuntimeToken)
	query.Set("ephemeral", "1")
	endpoint.RawQuery = query.Encode()

	dialer := websocket.Dialer{Proxy: http.ProxyFromEnvironment, HandshakeTimeout: 10 * time.Second}
	ws, response, err := dialer.Dial(endpoint.String(), nil)
	if err != nil {
		if response != nil {
			return nil, fmt.Errorf("terminal WebSocket returned HTTP %d", response.StatusCode)
		}
		return nil, errors.New("terminal WebSocket dial failed")
	}
	_ = ws.SetReadDeadline(time.Now().Add(10 * time.Second))
	messageType, message, err := ws.ReadMessage()
	_ = ws.SetReadDeadline(time.Time{})
	if err != nil || messageType != websocket.TextMessage {
		_ = ws.Close()
		return nil, errors.New("terminal WebSocket did not open a session")
	}
	var control terminalControlMessage
	if json.Unmarshal(message, &control) != nil || control.Type != "session" {
		_ = ws.Close()
		return nil, errors.New("terminal WebSocket rejected the session")
	}
	return ws, nil
}

func handleSSHRequests(requests <-chan *ssh.Request, ws *websocket.Conn, writeMu *sync.Mutex, shellReady chan<- bool) {
	shellStarted := false
	for request := range requests {
		switch request.Type {
		case "pty-req":
			var pty ptyRequest
			if ssh.Unmarshal(request.Payload, &pty) != nil || !sendResize(ws, writeMu, pty.Width, pty.Height) {
				_ = request.Reply(false, nil)
				continue
			}
			_ = request.Reply(true, nil)
		case "window-change":
			var size windowChangeRequest
			if ssh.Unmarshal(request.Payload, &size) != nil || !sendResize(ws, writeMu, size.Width, size.Height) {
				_ = request.Reply(false, nil)
				continue
			}
			_ = request.Reply(true, nil)
		case "shell":
			if shellStarted || len(request.Payload) != 0 {
				_ = request.Reply(false, nil)
				continue
			}
			shellStarted = true
			_ = request.Reply(true, nil)
			shellReady <- true
		default:
			_ = request.Reply(false, nil)
		}
	}
	if !shellStarted {
		shellReady <- false
	}
}

func sendResize(ws *websocket.Conn, writeMu *sync.Mutex, cols, rows uint32) bool {
	if cols > 65535 || rows > 65535 {
		return false
	}
	if cols == 0 || rows == 0 {
		return true
	}
	writeMu.Lock()
	err := ws.WriteJSON(terminalControlMessage{Type: "resize", Cols: cols, Rows: rows})
	writeMu.Unlock()
	return err == nil
}

func writeAll(writer io.Writer, payload []byte) error {
	for len(payload) > 0 {
		n, err := writer.Write(payload)
		if err != nil {
			return err
		}
		if n == 0 {
			return io.ErrShortWrite
		}
		payload = payload[n:]
	}
	return nil
}
