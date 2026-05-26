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

	if session.Ptmx != nil {
		if !session.ReaderStarted {
			session.ReaderStarted = true
			ptmx := session.Ptmx
			session.Mu.Unlock()
			go readPTYOutput(session, ptmx)
			return nil
		}
		session.Mu.Unlock()
		return nil
	}

	cmd := exec.Command("bash", "-l")
	cmd.Dir = os.Getenv("HOME")

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: defaultRows, Cols: defaultCols})
	if err != nil {
		session.Mu.Unlock()
		return fmt.Errorf("failed to start pty: %w", err)
	}

	session.Ptmx = ptmx
	session.ReaderStarted = true
	session.Mu.Unlock()

	go readPTYOutput(session, ptmx)
	return nil
}

func readPTYOutput(session *store.TerminalSession, ptmx *os.File) {
	buf := make([]byte, ptyBufSize)
	for {
		n, err := ptmx.Read(buf)
		if err != nil {
			if err != io.EOF {
				fmt.Printf("pty read error: %v\n", err)
			}
			return
		}

		session.AppendOutput(buf[:n])
	}
}

func PipePTYToWebSocket(conn *websocket.Conn, writeMu *sync.Mutex, session *store.TerminalSession, isActive func(string) bool) func() {
	output, unsubscribe := session.Subscribe()

	go func() {
		for data := range output {
			if !isActive(session.ID) {
				continue
			}

			writeMu.Lock()
			writeErr := conn.WriteMessage(websocket.BinaryMessage, data)
			writeMu.Unlock()
			if writeErr != nil {
				return
			}
		}
	}()

	return func() {
		unsubscribe()
	}
}

func WritePTYBufferToWebSocket(conn *websocket.Conn, writeMu *sync.Mutex, session *store.TerminalSession) {
	session.Mu.Lock()
	buffer := append([]byte(nil), session.Buffer...)
	session.Mu.Unlock()

	if len(buffer) > 0 {
		writeMu.Lock()
		_ = conn.WriteMessage(websocket.BinaryMessage, buffer)
		writeMu.Unlock()
	}
}

func HandlePTYInput(session *store.TerminalSession, msg []byte) error {
	if session == nil || session.Ptmx == nil {
		return nil
	}

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
