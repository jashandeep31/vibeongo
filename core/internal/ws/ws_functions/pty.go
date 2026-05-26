package wsfunctions

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

const (
	defaultRows = 40
	defaultCols = 155
	ptyBufSize  = 4096
)

type sizeData struct {
	Rows uint16 `json:"rows"`
	Cols uint16 `json:"cols"`
}

type SsMessage struct {
	Type string   `json:"type"`
	Data sizeData `json:"data"`
}

func PtyHandler(conn *websocket.Conn, writeMu *sync.Mutex, session *store.TerminalSession) error {
	cmd := exec.Command("bash", "-l")
	cmd.Dir = os.Getenv("HOME")

	if session.Ptmx == nil {
		ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: defaultRows, Cols: defaultCols})
		session.Ptmx = ptmx
		if err != nil {
			writeMu.Lock()
			_ = conn.WriteMessage(websocket.TextMessage, []byte("Failed to start terminal session\n"))
			writeMu.Unlock()
			return err
		}
	}

	ptmx := session.Ptmx

	if len(session.Buffer) > 0 {
		session.Mu.Lock()
		_ = conn.WriteMessage(websocket.BinaryMessage, session.Buffer)
		session.Mu.Unlock()
	}

	go pipePTYToWebSocket(conn, ptmx, writeMu, session)

	return pipeWebSocketToPTY(conn, ptmx)
}

func pipePTYToWebSocket(conn *websocket.Conn, ptmx *os.File, writeMu *sync.Mutex, session *store.TerminalSession) {
	buf := make([]byte, ptyBufSize)
	for {
		n, err := ptmx.Read(buf)
		if err != nil {
			if err != io.EOF {
				fmt.Printf("pty read error: %v\n", err)
			}
			return
		}

		session.Mu.Lock()
		session.Buffer = append(session.Buffer, buf[:n]...)
		session.Mu.Unlock()

		writeMu.Lock()
		writeErr := conn.WriteMessage(websocket.BinaryMessage, buf[:n])
		writeMu.Unlock()
		if writeErr != nil {
			return
		}
	}
}

func pipeWebSocketToPTY(conn *websocket.Conn, ptmx *os.File) error {
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}

		var m SsMessage
		if err := json.Unmarshal(msg, &m); err != nil || m.Type == "" {
			// Not a JSON control message — raw terminal input, write directly
			if _, err := ptmx.Write(msg); err != nil {
				return err
			}
			continue
		}
		switch m.Type {
		case "size":
			if err := pty.Setsize(ptmx, &pty.Winsize{
				Rows: m.Data.Rows,
				Cols: m.Data.Cols,
			}); err != nil {
				fmt.Printf("failed to resize pty: %v\n", err)
			}
		default:
			fmt.Printf("Unknown message type: %s\n", m.Type)
		}
	}
}
