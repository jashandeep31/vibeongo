package newstores

import (
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sort"
	"sync"
	"time"

	"github.com/creack/pty"
)

type TerminalSession struct {
	ID          string
	Buffer      []byte
	Ptmx        *os.File
	Mu          sync.Mutex
	CreatedAt   time.Time
	command     *exec.Cmd
	processDone chan struct{}
	killOnce    sync.Once
	killErr     error
	readerOnce  sync.Once
	subscribers map[chan []byte]struct{}
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

// GetTerminalSessionIDs returns a stable snapshot of the stored terminal
// sessions, ordered from oldest to newest.
func (s *SessionsStore) GetTerminalSessionIDs() []string {
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

	ids := make([]string, len(sessions))
	for i, session := range sessions {
		ids[i] = session.ID
	}
	return ids
}

func (s *SessionsStore) CreateTerminalSession(workingDirectory string) (*TerminalSession, error) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	baseCommand := exec.Command("bash")
	baseCommand.Dir = workingDirectory
	ptmx, err := pty.StartWithSize(baseCommand, &pty.Winsize{Rows: 40, Cols: 90})
	if err != nil {
		return nil, err
	}
	termSession := &TerminalSession{
		ID:          rand.Text(),
		Buffer:      make([]byte, 0),
		Ptmx:        ptmx,
		CreatedAt:   time.Now(),
		command:     baseCommand,
		processDone: make(chan struct{}),
		subscribers: make(map[chan []byte]struct{}),
	}
	s.sessions[termSession.ID] = termSession
	termSession.startReader()
	go func() {
		_ = baseCommand.Wait()
		close(termSession.processDone)
	}()
	return termSession, nil
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
