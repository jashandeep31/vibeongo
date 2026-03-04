package ws

import (
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
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	cmd := exec.Command("bash")
	ptmx, err := pty.Start(cmd)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Failed to start a terminal session \n"))
		return err
	}

	defer func() {
		// WARN: handle the closing of the terminal in the better way
		ptmx.Close()
	}()

	// pty output to the user
	go func() {
		buf := make([]byte, 1024)
		for {
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
		_, err = ptmx.Write(msg)
		if err != nil {
			return err
		}
	}
	// for {
	// 	msgType, msg, err := conn.ReadMessage()
	// 	if err != nil {
	// 		if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
	// 			return nil
	// 		}
	// 		return err
	// 	}
	//
	// 	if err := conn.WriteMessage(msgType, msg); err != nil {
	// 		return err
	// 	}
	// }
}
