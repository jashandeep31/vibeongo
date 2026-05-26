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

type PTYMessage struct {
	Type string `json:"type"`
	Data struct {
		Rows uint16 `json:"rows"`
		Cols uint16 `json:"cols"`
	} `json:"data"`
}

func StartPTY(session *store.TerminalSession) error {
	session.Mu.Lock()
	defer session.Mu.Unlock()

	if session.Ptmx != nil {
		return nil
	}

	cmd := exec.Command("bash", "-l")
	cmd.Dir = os.Getenv("HOME")

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: defaultRows, Cols: defaultCols})
	if err != nil {
		return fmt.Errorf("failed to start pty: %w", err)
	}

	session.Ptmx = ptmx
	return nil
}

func PipePTYToWebSocket(conn *websocket.Conn, writeMu *sync.Mutex, session *store.TerminalSession) {
	buf := make([]byte, ptyBufSize)
	for {
		n, err := session.Ptmx.Read(buf)
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

func HandlePTYInput(session *store.TerminalSession, msg []byte) error {
	var m PTYMessage
	if err := json.Unmarshal(msg, &m); err != nil || m.Type == "" {
		// Not a JSON control message — raw terminal input, write directly
		_, err := session.Ptmx.Write(msg)
		return err
	}

	switch m.Type {
	case "size":
		return pty.Setsize(session.Ptmx, &pty.Winsize{
			Rows: m.Data.Rows,
			Cols: m.Data.Cols,
		})
	default:
		return nil
	}
}

