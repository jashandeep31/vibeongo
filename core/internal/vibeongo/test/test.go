package test

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"strings"
)

func TestFnc() error {
	sessions, err := getListOfTmuxSessions()
	output, err := json.Marshal(sessions)
	fmt.Println(string(output))

	fmt.Println(err)
	list, err := getListFavoriteDirs()
	fmt.Println(list)
	return nil
}

type tmuxWindowPane struct {
	Name string `json:"name"`
}

type tmuxWindow struct {
	Name  string           `json:"name"`
	Panes []tmuxWindowPane `json:"panes"`
}

type tmuxSession struct {
	Name    string       `json:"name"`
	Windows []tmuxWindow `json:"windows"`
}

func getListOfTmuxSessions() ([]tmuxSession, error) {
	cmd := exec.Command(
		"tmux",
		"list-panes",
		"-a",
		"-F",
		"#{session_name}\t#{window_name}\t#{pane_index}",
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")

	sessionMap := make(map[string]*tmuxSession)

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, "\t", 3)
		if len(parts) != 3 {
			continue
		}

		sessionName := parts[0]
		windowName := parts[1]
		paneName := parts[2]

		// Create session if it doesn't exist
		session, exists := sessionMap[sessionName]
		if !exists {
			session = &tmuxSession{
				Name:    sessionName,
				Windows: []tmuxWindow{},
			}

			sessionMap[sessionName] = session
		}

		// Find window
		var window *tmuxWindow

		for i := range session.Windows {
			if session.Windows[i].Name == windowName {
				window = &session.Windows[i]
				break
			}
		}

		// Create window if it doesn't exist
		if window == nil {
			session.Windows = append(session.Windows, tmuxWindow{
				Name:  windowName,
				Panes: []tmuxWindowPane{},
			})

			window = &session.Windows[len(session.Windows)-1]
		}

		// Add pane
		window.Panes = append(window.Panes, tmuxWindowPane{
			Name: paneName,
		})
	}

	// Convert map to slice
	sessions := make([]tmuxSession, 0, len(sessionMap))

	for _, session := range sessionMap {
		sessions = append(sessions, *session)
	}

	return sessions, nil
}

type favoriteDirsList struct {
	name string
	path string
}

func getListFavoriteDirs() ([]favoriteDirsList, error) {
	list := []favoriteDirsList{}
	fmt.Println("getting list of dirs")
	currentUser, err := user.Current()
	username := currentUser.Username
	if err != nil {
		return list, err
	}

	codeDirPath := fmt.Sprintf("/home/%s/Dev", username)
	entries, err := os.ReadDir(codeDirPath)
	if err != nil {
		return list, err
	}
	for _, entry := range entries {
		isDir := entry.IsDir()
		if isDir {
			list = append(list, favoriteDirsList{
				name: entry.Name(),
				path: codeDirPath + "/" + entry.Name(),
			})
		}
	}

	// append the vibeongo config folder
	list = append(list, favoriteDirsList{
		name: "Config",
		path: fmt.Sprintf("/home/%s/.config/vibeongo", username),
	})

	// logs folder
	list = append(list, favoriteDirsList{
		name: "Logs Vibeongo",
		path: fmt.Sprintf("/home/%s/.logs", username),
	})

	return list, nil
}
