package ws

import (
	"log"
	"reflect"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
	"github.com/labstack/echo/v5"
)

func WebSocketV2() echo.HandlerFunc {
	return func(c *echo.Context) error {
		var writeMu sync.Mutex

		conn, err := upgrader.Upgrade(c.Response(), c.Request(), c.Request().Header)
		if err != nil {
			return err
		}

		// closing the connection
		defer conn.Close()

		// creating channels
		stopTmuxPolling := make(chan struct{})
		tmuxPollingDone := make(chan struct{})

		go func() {
			defer close(tmuxPollingDone)
			if err := handleTmuxSessionsList(conn, &writeMu, stopTmuxPolling); err != nil {
				log.Println("Tmux session polling failed:", err)
				conn.Close()
			}
		}()

		defer func() {
			close(stopTmuxPolling)
			<-tmuxPollingDone
		}()

		// handling the messages
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

func handleTmuxSessionsList(conn *websocket.Conn, writeMu *sync.Mutex, stop <-chan struct{}) error {

	// func to send list of sessions
	sendSessions := func(sessions []utils.TmuxSession) error {
		writeMu.Lock()
		defer writeMu.Unlock()

		return conn.WriteJSON(struct {
			Type     string              `json:"type"`
			Sessions []utils.TmuxSession `json:"sessions"`
		}{
			Type:     "tmuxSessions",
			Sessions: sessions,
		})
	}

	var previousSessions []utils.TmuxSession

	sessions, err := utils.GetListOfTmuxSessions()
	if err != nil {
		log.Println("Failed to get tmux sessions:", err)
	} else {
		if err := sendSessions(sessions); err != nil {
			log.Println("Failed to send tmux sessions:", err)
			return err
		}
		previousSessions = sessions
	}

	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			currentSessions, err := utils.GetListOfTmuxSessions()
			if err != nil {
				log.Println("Failed to get tmux sessions:", err)
				continue
			}

			if reflect.DeepEqual(previousSessions, currentSessions) {
				continue
			}

			if err := sendSessions(currentSessions); err != nil {
				return err
			}
			previousSessions = currentSessions
		case <-stop:
			return nil
		}
	}
}
