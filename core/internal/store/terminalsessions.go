package store

import (
	"maps"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
)

// TerminalSession saving bufs of terminal session
type TerminalSession struct {
	ID            string
	Buffer        []byte
	Ptmx          *os.File
	Mu            sync.Mutex
	CreatedAt     time.Time
	ReaderStarted bool
	subscribers   map[chan []byte]struct{}
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

func (s *SessionStore) GetActiveID() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.ActiveId
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
	sessions := make(map[string]*TerminalSession, len(s.sessions))
	maps.Copy(sessions, s.sessions)
	return sessions
}

func (s *SessionStore) createSession() (*TerminalSession, error) {
	id := uuid.New().String()

	sess := &TerminalSession{
		ID:          id,
		Buffer:      make([]byte, 0),
		Ptmx:        nil,
		Mu:          sync.Mutex{},
		CreatedAt:   time.Now(),
		subscribers: make(map[chan []byte]struct{}),
	}

	s.ActiveId = id
	s.sessions[id] = sess
	return sess, nil
}

func (s *TerminalSession) AppendOutput(output []byte) {
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

func (s *TerminalSession) HasBuffer() bool {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	return len(s.Buffer) > 0
}

func (s *TerminalSession) Subscribe() (<-chan []byte, func()) {
	s.Mu.Lock()
	defer s.Mu.Unlock()

	if s.subscribers == nil {
		s.subscribers = make(map[chan []byte]struct{})
	}

	ch := make(chan []byte, 256)
	s.subscribers[ch] = struct{}{}

	return ch, func() {
		s.Mu.Lock()
		defer s.Mu.Unlock()

		if _, ok := s.subscribers[ch]; ok {
			delete(s.subscribers, ch)
			close(ch)
		}
	}
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
	// getting random session if we can
	for id := range s.sessions {
		if s.sessions[id] != nil {
			s.ActiveId = id
			return s.sessions[id], nil
		}
	}
	return s.createSession()
}

func (s *SessionStore) SwitchSession(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.sessions[id]; !ok {
		return os.ErrNotExist
	}
	s.ActiveId = id
	return nil
}
