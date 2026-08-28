package utils

import (
	"fmt"
	"os/exec"
	"sort"
	"strings"
)

type TmuxWindowPane struct {
	Name string `json:"name"`
}

type TmuxWindow struct {
	ID    string           `json:"id"`
	Name  string           `json:"name"`
	Panes []TmuxWindowPane `json:"panes"`
}

type TmuxSession struct {
	Name    string       `json:"name"`
	Windows []TmuxWindow `json:"windows"`
}

func GetListOfTmuxSessions() ([]TmuxSession, error) {
	cmd := exec.Command(
		"tmux",
		"list-panes",
		"-a",
		"-F",
		"#{session_name}\t#{window_id}\t#{window_name}\t#{pane_index}",
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		message := strings.ToLower(string(output))
		if strings.Contains(message, "no server running") ||
			strings.Contains(message, "failed to connect to server") {
			return []TmuxSession{}, nil
		}

		return nil, fmt.Errorf("list tmux sessions: %w: %s", err, strings.TrimSpace(string(output)))
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	sessionMap := make(map[string]*TmuxSession)

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, "\t", 4)
		if len(parts) != 4 {
			continue
		}

		sessionName := parts[0]
		windowID := parts[1]
		windowName := parts[2]
		paneName := parts[3]

		session, exists := sessionMap[sessionName]
		if !exists {
			session = &TmuxSession{
				Name:    sessionName,
				Windows: []TmuxWindow{},
			}
			sessionMap[sessionName] = session
		}

		var window *TmuxWindow
		for i := range session.Windows {
			if session.Windows[i].ID == windowID {
				window = &session.Windows[i]
				break
			}
		}

		if window == nil {
			session.Windows = append(session.Windows, TmuxWindow{
				ID:    windowID,
				Name:  windowName,
				Panes: []TmuxWindowPane{},
			})
			window = &session.Windows[len(session.Windows)-1]
		}

		window.Panes = append(window.Panes, TmuxWindowPane{
			Name: paneName,
		})
	}

	sessions := make([]TmuxSession, 0, len(sessionMap))
	for _, session := range sessionMap {
		sessions = append(sessions, *session)
	}
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].Name < sessions[j].Name
	})

	return sessions, nil
}
