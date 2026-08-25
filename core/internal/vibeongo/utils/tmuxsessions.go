package utils

import (
	"os/exec"
	"strings"
)

type TmuxWindowPane struct {
	Name string `json:"name"`
}

type TmuxWindow struct {
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
		"#{session_name}\t#{window_name}\t#{pane_index}",
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	sessionMap := make(map[string]*TmuxSession)

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
			if session.Windows[i].Name == windowName {
				window = &session.Windows[i]
				break
			}
		}

		if window == nil {
			session.Windows = append(session.Windows, TmuxWindow{
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

	return sessions, nil
}
