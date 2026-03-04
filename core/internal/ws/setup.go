package ws

import (
	"fmt"
	"net/http"
	"os/exec"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v5"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // WARN: Please disable this in the production
	},
}

func WebSocket(c *echo.Context) error {
	// setting up the websocket
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	defer conn.Close()

	// pty setup
	cmd := exec.Command("bash", "-l")
	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: 30, Cols: 120})
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Failed to start a terminal session \n"))
		return err
	}
	fmt.Println("terminal is started")

	defer func() {
		// WARN: handle the closing of the terminal in the better way
		fmt.Println("Terminal is closed")
		ptmx.Close()
	}()

	// pty output to the user
	go func() {
		buf := make([]byte, 1024)
		for {
			fmt.Println(string(buf))
			n, err := ptmx.Read(buf)
			if err != nil {
				return
			}

			conn.WriteMessage(websocket.BinaryMessage, buf[:n])
		}
	}()

	// user input to pty
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}
		fmt.Println("input is here", string(msg))
		_, err = ptmx.Write(msg)
		if err != nil {
			return err
		}
	}
}
