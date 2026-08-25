package ws

import (
	"log"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
	"github.com/labstack/echo/v5"
)

func WebSocketV2() echo.HandlerFunc {
	return func(c *echo.Context) error {
		conn, err := upgrader.Upgrade(c.Response(), c.Request(), c.Request().Header)
		if err != nil {
			return err
		}

		// closing the connection
		defer conn.Close()

		sessions, err := utils.GetListOfTmuxSessions()
		if err != nil {
			log.Println("Failed to get tmux sessions:", err)
		} else if err := conn.WriteJSON(struct {
			Type     string              `json:"type"`
			Sessions []utils.TmuxSession `json:"sessions"`
		}{
			Type:     "tmuxSessions",
			Sessions: sessions,
		}); err != nil {
			log.Println("Failed to send tmux sessions:", err)
			return err
		}

		// handling the messages
		for {
			messageType, msg, err := conn.ReadMessage()
			if err != nil {
				log.Println("Read failed:", err)
				break
			}
			log.Printf("Received: %s", msg)

			// Echo message back to client
			err = conn.WriteMessage(messageType, msg)
			if err != nil {
				log.Println("Write failed:", err)
				break
			}
		}

		return nil
	}
}
