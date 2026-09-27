package main

import (
	"fmt"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

func connectToWebSocket(channel ssh.Channel, requests <-chan *ssh.Request) {
	ws, _, err := websocket.DefaultDialer.Dial("ws://localhost:8006/ws", nil)
	if err != nil {
		fmt.Println("Error connecting to websocket:", err)
		return
	}
	defer ws.Close()

	go handleSSHRequests(requests)
	errCh := make(chan error, 2)

	// SSH INPUT → WebSocket → PTY
	go func() {
		buf := make([]byte, 32*1024)

		for {
			n, err := channel.Read(buf)
			if err != nil {
				errCh <- err
				return
			}

			if n > 0 {
				data := make([]byte, n)
				copy(data, buf[:n])

				if err := ws.WriteMessage(websocket.BinaryMessage, data); err != nil {
					errCh <- err
					return
				}
			}
		}
	}()
	// PTY OUTPUT → WebSocket → SSH
	go func() {
		for {
			_, message, err := ws.ReadMessage()
			if err != nil {
				errCh <- err
				return
			}

			_, err = channel.Write(message)
			if err != nil {
				errCh <- err
				return
			}
		}
	}()

	// Keep this SSH session alive until either side dies.
	err = <-errCh
	fmt.Println("session ended:", err)
}

type PtyRequest struct {
	Term     string
	Width    uint32
	Height   uint32
	WidthPx  uint32
	HeightPx uint32
	Modes    string
}

type WindowChange struct {
	Width    uint32
	Height   uint32
	WidthPx  uint32
	HeightPx uint32
}

func handleSSHRequests(requests <-chan *ssh.Request) {
	for req := range requests {
		switch req.Type {

		case "pty-req":
			var ptyReq PtyRequest
			if err := ssh.Unmarshal(req.Payload, &ptyReq); err != nil {
				fmt.Println("failed to parse pty request:", err)
				req.Reply(false, nil)
				continue
			}

			fmt.Printf(
				"PTY: term=%s width=%d height=%d\n",
				ptyReq.Term,
				ptyReq.Width,
				ptyReq.Height,
			)
			fmt.Println("PTY requested")
			req.Reply(true, nil)

		case "shell":
			fmt.Println("Shell requested")
			req.Reply(true, nil)

		case "window-change":
			fmt.Println("Terminal resized")
			req.Reply(true, nil)

		default:
			fmt.Println("Unknown SSH request:", req.Type)
			req.Reply(false, nil)
		}
	}
}
