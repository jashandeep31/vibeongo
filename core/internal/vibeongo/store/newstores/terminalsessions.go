package newstores

import (
	"crypto/rand"
	"fmt"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/creack/pty"
)

type TerminalSession struct {
	ID        string
	Buffer    []byte
	Ptmx      *os.File
	Mu        sync.Mutex
	CreatedAt time.Time
}

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
	return nil, fmt.Errorf("Terminal Session not round")
}

func (s *SessionsStore) CreateTerminalSession() (*TerminalSession, error) {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	baseCommand := exec.Command("bash")
	ptmx, err := pty.StartWithSize(baseCommand, &pty.Winsize{Rows: 40, Cols: 90})
	if err != nil {
		return nil, err
	}
	termSession := TerminalSession{
		ID:        rand.Text(),
		Buffer:    make([]byte, 0),
		Ptmx:      ptmx,
		Mu:        sync.Mutex{},
		CreatedAt: time.Now(),
	}
	return &termSession, nil
}
