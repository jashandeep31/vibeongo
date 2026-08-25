package newstores

import (
	"crypto/rand"
	"fmt"
	"io"
	"os"
	"os/exec"
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
	readerOnce  sync.Once
	subscribers map[chan []byte]struct{}
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
	termSession := &TerminalSession{
		ID:          rand.Text(),
		Buffer:      make([]byte, 0),
		Ptmx:        ptmx,
		CreatedAt:   time.Now(),
		subscribers: make(map[chan []byte]struct{}),
	}
	s.sessions[termSession.ID] = termSession
	termSession.startReader()
	return termSession, nil
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
					if err != io.EOF {
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
