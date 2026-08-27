package ws

import (
	"log"
	"os"
	"os/user"
	"path/filepath"
	"reflect"
	"slices"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store/newstores"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
	"github.com/labstack/echo/v5"
)

func WebSocketV2(tools *store.Tools) echo.HandlerFunc {
	return func(c *echo.Context) error {
		var writeMu sync.Mutex

		conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			return err
		}

		// closing the connection
		defer conn.Close()

		// creating channels
		stopTmuxPolling := make(chan struct{})
		tmuxPollingDone := make(chan struct{})
		stopTerminalPolling := make(chan struct{})
		terminalPollingDone := make(chan struct{})
		stopFavoriteDirsPolling := make(chan struct{})
		favoriteDirsPollingDone := make(chan struct{})

		go func() {
			defer close(tmuxPollingDone)
			if err := handleTmuxSessionsList(conn, &writeMu, stopTmuxPolling); err != nil {
				log.Println("Tmux session polling failed:", err)
				conn.Close()
			}
		}()
		go func() {
			defer close(terminalPollingDone)
			if err := handleTerminalSessionsList(conn, &writeMu, tools.TerminalSessionStore, stopTerminalPolling); err != nil {
				log.Println("Terminal session polling failed:", err)
				conn.Close()
			}
		}()
		go func() {
			defer close(favoriteDirsPollingDone)
			if err := handleFavoriteDirsList(conn, &writeMu, stopFavoriteDirsPolling); err != nil {
				log.Println("Favorite directory polling failed:", err)
				conn.Close()
			}
		}()

		defer func() {
			close(stopTmuxPolling)
			close(stopTerminalPolling)
			close(stopFavoriteDirsPolling)
			<-tmuxPollingDone
			<-terminalPollingDone
			<-favoriteDirsPollingDone
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

type favoriteDir struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

func handleFavoriteDirsList(conn *websocket.Conn, writeMu *sync.Mutex, stop <-chan struct{}) error {
	currentUser, err := user.Current()
	if err != nil {
		return err
	}

	sendDirs := func(dirs []favoriteDir) error {
		writeMu.Lock()
		defer writeMu.Unlock()

		return conn.WriteJSON(struct {
			Type string        `json:"type"`
			Dirs []favoriteDir `json:"dirs"`
		}{
			Type: "favoriteDirs",
			Dirs: dirs,
		})
	}

	previousDirs, err := getListFavoriteDirs(currentUser.HomeDir)
	if err != nil {
		return err
	}
	if err := sendDirs(previousDirs); err != nil {
		return err
	}

	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			currentDirs, err := getListFavoriteDirs(currentUser.HomeDir)
			if err != nil {
				log.Println("Failed to get favorite directories:", err)
				continue
			}
			if slices.Equal(previousDirs, currentDirs) {
				continue
			}
			if err := sendDirs(currentDirs); err != nil {
				return err
			}
			previousDirs = currentDirs
		case <-stop:
			return nil
		}
	}
}

func getListFavoriteDirs(homeDir string) ([]favoriteDir, error) {
	dirs := make([]favoriteDir, 0)
	codeDir := filepath.Join(homeDir, "code")
	entries, err := os.ReadDir(codeDir)
	if err != nil && !os.IsNotExist(err) {
		return nil, err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			dirs = append(dirs, favoriteDir{
				Name: entry.Name(),
				Path: filepath.Join(codeDir, entry.Name()),
			})
		}
	}

	dirs = append(dirs, favoriteDir{Name: "Home", Path: homeDir})
	dirs = appendExistingFavoriteDir(dirs, "Config", filepath.Join(homeDir, ".config", "vibeongo"))
	dirs = appendExistingFavoriteDir(dirs, "Logs Vibeongo", filepath.Join(homeDir, ".logs"))

	return dirs, nil
}

func appendExistingFavoriteDir(dirs []favoriteDir, name, path string) []favoriteDir {
	info, err := os.Stat(path)
	if err == nil && info.IsDir() {
		return append(dirs, favoriteDir{Name: name, Path: path})
	}
	return dirs
}

func handleTerminalSessionsList(conn *websocket.Conn, writeMu *sync.Mutex, sessionsStore *newstores.SessionsStore, stop <-chan struct{}) error {
	sendSessions := func(ids []string) error {
		writeMu.Lock()
		defer writeMu.Unlock()

		return conn.WriteJSON(struct {
			Type     string   `json:"type"`
			IDs      []string `json:"ids"`
			ActiveID string   `json:"activeId"`
		}{
			Type: "sessionIds",
			IDs:  ids,
		})
	}

	previousIDs := sessionsStore.GetTerminalSessionIDs()
	if err := sendSessions(previousIDs); err != nil {
		log.Println("Failed to send terminal sessions:", err)
		return err
	}

	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			currentIDs := sessionsStore.GetTerminalSessionIDs()
			if slices.Equal(previousIDs, currentIDs) {
				continue
			}

			if err := sendSessions(currentIDs); err != nil {
				return err
			}
			previousIDs = currentIDs
		case <-stop:
			return nil
		}
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
