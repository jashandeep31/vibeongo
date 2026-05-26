package store

import (
	"os"
	"sync"

	"github.com/google/uuid"
)

// TerminalSession saving bufs of terminal session
type TerminalSession struct {
	Buffer []byte
	Ptmx   *os.File
	Mu     sync.Mutex
}

type SessionStore struct {
	mu       sync.Mutex
	sessions map[string]*TerminalSession
	ActiveId string
}

func NewSessionStore() *SessionStore {
	return &SessionStore{
		sessions: make(map[string]*TerminalSession),
	}
}

func (s *SessionStore) GetSession(id string) (*TerminalSession, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[id]
	return sess, ok
}

func (s *SessionStore) DelSession(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, id)
	return nil
}

func (s *SessionStore) GetSessions() map[string]*TerminalSession {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.sessions
}

func (s *SessionStore) createSession() (*TerminalSession, error) {
	id := uuid.New().String()

	sess := &TerminalSession{
		Buffer: make([]byte, 0),
		Ptmx:   nil,
		Mu:     sync.Mutex{},
	}

	s.ActiveId = id
	s.sessions[id] = sess
	return sess, nil
}

func (s *SessionStore) CreateSession() (*TerminalSession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.createSession()
}

func (s *SessionStore) GetOrCreateSession() (*TerminalSession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.ActiveId != "" {
		if s.sessions[s.ActiveId] != nil {
			return s.sessions[s.ActiveId], nil
		}
	}
	return s.createSession()
}
