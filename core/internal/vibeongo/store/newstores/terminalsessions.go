package newstores

import (
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/creack/pty"
)

type TerminalSession struct {
	ID               string
	Name             string
	Kind             TerminalSessionKind
	WorkingDirectory string
	TmuxSessionName  string
	TmuxWindowID     string
	TmuxWindowName   string
	Buffer           []byte
	Ptmx             *os.File
	Mu               sync.Mutex
	CreatedAt        time.Time
	command          *exec.Cmd
	processDone      chan struct{}
	killOnce         sync.Once
	killErr          error
	readerOnce       sync.Once
	subscribers      map[chan []byte]struct{}
}

type TerminalSessionKind string

const (
	TerminalSessionKindShell TerminalSessionKind = "shell"
	TerminalSessionKindTmux  TerminalSessionKind = "tmux"
)

const terminalPreviewBufferLimit = 12_000

// TerminalSessionDescriptor is the backend-owned identity and bounded output
// preview published to every workspace client. It contains no PTY or process
// implementation details.
type TerminalSessionDescriptor struct {
	ID               string              `json:"id"`
	Name             string              `json:"name"`
	Kind             TerminalSessionKind `json:"kind"`
	WorkingDirectory string              `json:"workingDirectory,omitempty"`
	TmuxSessionName  string              `json:"tmuxSessionName,omitempty"`
	TmuxWindowID     string              `json:"tmuxWindowId,omitempty"`
	TmuxWindowName   string              `json:"tmuxWindowName,omitempty"`
	Buffer           string              `json:"buffer,omitempty"`
}

var ErrTerminalSessionNotFound = errors.New("terminal session not found")

type SessionsStore struct {
	Mu       sync.Mutex
	sessions map[string]*TerminalSession
}

func NewSessionsStore() *SessionsStore {
	return &SessionsStore{
		sessions: make(map[string]*TerminalSession),
	}
}

func (s *SessionsStore) GetTerminalSession(id string) (*TerminalSession, error) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	termSession, ok := s.sessions[id]
	if ok {
		return termSession, nil
	}
	return nil, fmt.Errorf("%w: %s", ErrTerminalSessionNotFound, id)
}

// GetTerminalSessions returns backend-owned terminal identities ordered from
// oldest to newest.
func (s *SessionsStore) GetTerminalSessions() []TerminalSessionDescriptor {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	sessions := make([]*TerminalSession, 0, len(s.sessions))
	for _, session := range s.sessions {
		sessions = append(sessions, session)
	}

	sort.Slice(sessions, func(i, j int) bool {
		if sessions[i].CreatedAt.Equal(sessions[j].CreatedAt) {
			return sessions[i].ID < sessions[j].ID
		}
		return sessions[i].CreatedAt.Before(sessions[j].CreatedAt)
	})

	descriptors := make([]TerminalSessionDescriptor, len(sessions))
	for i, session := range sessions {
		descriptors[i] = session.descriptor()
	}
	return descriptors
}

func (s *TerminalSession) descriptor() TerminalSessionDescriptor {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	buffer := s.Buffer
	if len(buffer) > terminalPreviewBufferLimit {
		buffer = buffer[len(buffer)-terminalPreviewBufferLimit:]
	}
	return TerminalSessionDescriptor{
		ID:               s.ID,
		Name:             s.Name,
		Kind:             s.Kind,
		WorkingDirectory: s.WorkingDirectory,
		TmuxSessionName:  s.TmuxSessionName,
		TmuxWindowID:     s.TmuxWindowID,
		TmuxWindowName:   s.TmuxWindowName,
		Buffer:           string(buffer),
	}
}

func (s *SessionsStore) CreateTerminalSession(workingDirectory string) (*TerminalSession, error) {
	baseCommand := exec.Command("bash")
	baseCommand.Dir = workingDirectory
	return s.createTerminalSession(baseCommand, TerminalSessionDescriptor{
		Name:             filepath.Base(filepath.Clean(workingDirectory)),
		Kind:             TerminalSessionKindShell,
		WorkingDirectory: workingDirectory,
	})
}

// AttachTmuxTerminalSession creates a PTY-backed web terminal client for an
// existing tmux session. It never creates a tmux session. When windowID is
// present, that existing window is selected before the client attaches.
// Killing the web terminal detaches this client but does not destroy tmux.
func (s *SessionsStore) AttachTmuxTerminalSession(sessionName, windowID string) (*TerminalSession, error) {
	sessionTarget, windowTarget, err := tmuxTargets(sessionName, windowID)
	if err != nil {
		return nil, err
	}

	if output, err := exec.Command("tmux", "has-session", "-t", sessionTarget).CombinedOutput(); err != nil {
		return nil, tmuxCommandError("find", sessionName, output, err)
	}

	if windowTarget != "" {
		if output, err := exec.Command("tmux", "select-window", "-t", windowTarget).CombinedOutput(); err != nil {
			return nil, tmuxCommandError("select window in", sessionName, output, err)
		}
	}

	metadataTarget := windowTarget
	if metadataTarget == "" {
		// An empty window component resolves to the session's current window.
		// display-message needs a window/pane target to populate window_id and
		// window_name; a bare session target can leave both formats empty.
		metadataTarget = sessionTarget + ":"
	}
	windowOutput, err := exec.Command(
		"tmux", "display-message", "-p", "-t", metadataTarget,
		"#{window_id}\t#{window_name}",
	).CombinedOutput()
	if err != nil {
		return nil, tmuxCommandError("inspect", sessionName, windowOutput, err)
	}
	windowParts := strings.SplitN(strings.TrimSpace(string(windowOutput)), "\t", 2)
	if len(windowParts) != 2 || !validTmuxWindowID(windowParts[0]) || windowParts[1] == "" {
		return nil, fmt.Errorf("inspect tmux session %q: invalid window metadata", sessionName)
	}

	return s.createTerminalSession(
		exec.Command("tmux", "attach-session", "-t", sessionTarget),
		TerminalSessionDescriptor{
			Name:            fmt.Sprintf("%s › %s", strings.TrimSpace(sessionName), windowParts[1]),
			Kind:            TerminalSessionKindTmux,
			TmuxSessionName: strings.TrimSpace(sessionName),
			TmuxWindowID:    windowParts[0],
			TmuxWindowName:  windowParts[1],
		},
	)
}

func tmuxTargets(sessionName, windowID string) (string, string, error) {
	sessionName = strings.TrimSpace(sessionName)
	if sessionName == "" {
		return "", "", errors.New("tmux session name is required")
	}

	// A leading '=' asks tmux for an exact session-name match instead of its
	// default prefix/glob matching.
	sessionTarget := "=" + sessionName
	windowID = strings.TrimSpace(windowID)
	if windowID == "" {
		return sessionTarget, "", nil
	}
	if !validTmuxWindowID(windowID) {
		return "", "", errors.New("tmux window id must have the form @<number>")
	}
	return sessionTarget, fmt.Sprintf("%s:%s", sessionTarget, windowID), nil
}

func validTmuxWindowID(windowID string) bool {
	if len(windowID) < 2 || windowID[0] != '@' {
		return false
	}
	for _, character := range windowID[1:] {
		if character < '0' || character > '9' {
			return false
		}
	}
	return true
}

func tmuxCommandError(action, sessionName string, output []byte, err error) error {
	message := strings.TrimSpace(string(output))
	if message == "" {
		return fmt.Errorf("%s tmux session %q: %w", action, sessionName, err)
	}
	return fmt.Errorf("%s tmux session %q: %w: %s", action, sessionName, err, message)
}

func (s *SessionsStore) createTerminalSession(baseCommand *exec.Cmd, metadata TerminalSessionDescriptor) (*TerminalSession, error) {
	if err := validateTerminalSessionMetadata(metadata); err != nil {
		return nil, err
	}
	ptmx, err := pty.StartWithSize(baseCommand, &pty.Winsize{Rows: 40, Cols: 90})
	if err != nil {
		return nil, err
	}
	termSession := &TerminalSession{
		ID:               rand.Text(),
		Name:             metadata.Name,
		Kind:             metadata.Kind,
		WorkingDirectory: metadata.WorkingDirectory,
		TmuxSessionName:  metadata.TmuxSessionName,
		TmuxWindowID:     metadata.TmuxWindowID,
		TmuxWindowName:   metadata.TmuxWindowName,
		Buffer:           make([]byte, 0),
		Ptmx:             ptmx,
		CreatedAt:        time.Now(),
		command:          baseCommand,
		processDone:      make(chan struct{}),
		subscribers:      make(map[chan []byte]struct{}),
	}
	s.Mu.Lock()
	s.sessions[termSession.ID] = termSession
	s.Mu.Unlock()
	termSession.startReader()
	go func() {
		_ = baseCommand.Wait()
		close(termSession.processDone)
	}()
	return termSession, nil
}

func validateTerminalSessionMetadata(metadata TerminalSessionDescriptor) error {
	if strings.TrimSpace(metadata.Name) == "" {
		return errors.New("terminal session name is required")
	}
	switch metadata.Kind {
	case TerminalSessionKindShell:
		if strings.TrimSpace(metadata.WorkingDirectory) == "" {
			return errors.New("shell terminal working directory is required")
		}
		if metadata.TmuxSessionName != "" || metadata.TmuxWindowID != "" || metadata.TmuxWindowName != "" {
			return errors.New("shell terminal cannot contain tmux metadata")
		}
	case TerminalSessionKindTmux:
		if metadata.WorkingDirectory != "" {
			return errors.New("tmux terminal cannot contain a shell working directory")
		}
		if metadata.TmuxSessionName == "" || metadata.TmuxWindowID == "" || metadata.TmuxWindowName == "" {
			return errors.New("tmux terminal metadata is incomplete")
		}
	default:
		return fmt.Errorf("invalid terminal session kind %q", metadata.Kind)
	}
	return nil
}

// KillTerminalSession removes a terminal from the store and terminates its
// shell process and PTY. Removing it first prevents new clients from attaching
// while shutdown is in progress.
func (s *SessionsStore) KillTerminalSession(id string) error {
	s.Mu.Lock()
	terminalSession, ok := s.sessions[id]
	if ok {
		delete(s.sessions, id)
	}
	s.Mu.Unlock()

	if !ok {
		return fmt.Errorf("%w: %s", ErrTerminalSessionNotFound, id)
	}
	return terminalSession.kill()
}

func (s *TerminalSession) kill() error {
	s.killOnce.Do(func() {
		var errs []error
		waitForProcess := false
		if s.command != nil && s.command.Process != nil {
			if err := s.command.Process.Kill(); err == nil || errors.Is(err, os.ErrProcessDone) {
				waitForProcess = true
			} else {
				errs = append(errs, fmt.Errorf("kill terminal process: %w", err))
			}
		}
		if s.Ptmx != nil {
			if err := s.Ptmx.Close(); err != nil && !errors.Is(err, os.ErrClosed) {
				errs = append(errs, fmt.Errorf("close terminal PTY: %w", err))
			}
		}
		if waitForProcess && s.processDone != nil {
			<-s.processDone
		}

		s.Mu.Lock()
		for subscriber := range s.subscribers {
			delete(s.subscribers, subscriber)
			close(subscriber)
		}
		s.Mu.Unlock()

		s.killErr = errors.Join(errs...)
	})
	return s.killErr
}

func (s *TerminalSession) startReader() {
	s.readerOnce.Do(func() {
		go func() {
			buf := make([]byte, 32*1024)
			for {
				n, err := s.Ptmx.Read(buf)
				if n > 0 {
					s.appendOutput(buf[:n])
				}
				if err != nil {
					if err != io.EOF && !errors.Is(err, os.ErrClosed) {
						fmt.Printf("terminal PTY read failed: %v\n", err)
					}
					return
				}
			}
		}()
	})
}

func (s *TerminalSession) appendOutput(output []byte) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	data := append([]byte(nil), output...)
	s.Buffer = append(s.Buffer, data...)
	for subscriber := range s.subscribers {
		select {
		case subscriber <- data:
		default:
		}
	}
}

// Subscribe returns a snapshot of all previous output and a stream of future
// output. Taking both under the same lock prevents output from being lost
// between replaying the buffer and starting the live stream.
func (s *TerminalSession) Subscribe() ([]byte, <-chan []byte, func()) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	buffer := append([]byte(nil), s.Buffer...)
	output := make(chan []byte, 256)
	s.subscribers[output] = struct{}{}

	return buffer, output, func() {
		s.Mu.Lock()
		defer s.Mu.Unlock()
		if _, ok := s.subscribers[output]; ok {
			delete(s.subscribers, output)
			close(output)
		}
	}
}
