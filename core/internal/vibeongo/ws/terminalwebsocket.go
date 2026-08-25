package ws

import (
	"log"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/labstack/echo/v5"
)

type TerminalSession struct {
	ID        string
	Buffer    []byte
	Ptmx      *os.File
	Mu        sync.Mutex
	CreatedAt time.Time
}

func TerminalWebSocket() echo.HandlerFunc {
	return func(c *echo.Context) error {

		var writeMu sync.Mutex

		slug := c.Param("slug")
		// making the slug default to the new
		if slug == "" {
			slug = "new"
		}

		conn, err := upgrader.Upgrade(c.Response(), c.Request(), c.Request().Header)
		if err != nil {
			return err
		}
		defer conn.Close()

		// testing Context
		baseCommand := exec.Command("bash")

		ptmx, err := pty.Start(baseCommand)
		if err != nil {
			return err
		}

		// this may get removed
		defer func() { _ = ptmx.Close() }()

		for {
			messageType, msg, err := conn.ReadMessage()
			if err != nil {
				log.Println("Read failed:", err)
				break
			}
			log.Printf("Received: %s", msg)

			// Echo message back to client
			writeMu.Lock()
			err = conn.WriteMessage(messageType, msg)
			writeMu.Unlock()
			if err != nil {
				log.Println("Write failed:", err)
				break
			}
		}
		return nil
	}
}
