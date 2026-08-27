package store

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"
)

const WebSocketAuthTokenTTL = 30 * time.Second

type AuthToken struct {
	Host      string
	ExpiresAt time.Time
}

type AuthTokenStore struct {
	mu     sync.Mutex
	tokens map[string]AuthToken
	ttl    time.Duration
	now    func() time.Time
}

func NewAuthTokenStore() *AuthTokenStore {
	return newAuthTokenStore(WebSocketAuthTokenTTL, time.Now)
}

func newAuthTokenStore(ttl time.Duration, now func() time.Time) *AuthTokenStore {
	return &AuthTokenStore{
		tokens: make(map[string]AuthToken),
		ttl:    ttl,
		now:    now,
	}
}

// NewToken creates a cryptographically secure token with a fixed lifetime.
func (s *AuthTokenStore) NewToken(host string) (string, time.Time, error) {
	for {
		token, err := generateAuthToken()
		if err != nil {
			return "", time.Time{}, err
		}

		expiresAt := s.now().Add(s.ttl)

		s.mu.Lock()
		if _, exists := s.tokens[token]; exists {
			s.mu.Unlock()
			continue
		}
		s.tokens[token] = AuthToken{
			Host:      host,
			ExpiresAt: expiresAt,
		}
		s.mu.Unlock()

		time.AfterFunc(s.ttl, func() {
			s.expireTokenAt(token, expiresAt)
		})

		return token, expiresAt, nil
	}
}

// ValidateToken atomically validates and consumes a token.
func (s *AuthTokenStore) ValidateToken(token, host string) bool {
	if token == "" || host == "" {
		return false
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	tokenData, exists := s.tokens[token]
	if !exists {
		return false
	}

	if !s.now().Before(tokenData.ExpiresAt) {
		delete(s.tokens, token)
		return false
	}

	if tokenData.Host != host {
		return false
	}

	delete(s.tokens, token)
	return true
}

// ExpireToken removes a token before its scheduled expiration.
func (s *AuthTokenStore) ExpireToken(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.tokens, token)
}

func (s *AuthTokenStore) expireTokenAt(token string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if currentExpiry, exists := s.tokens[token]; exists && currentExpiry.ExpiresAt.Equal(expiresAt) {
		delete(s.tokens, token)
	}
}

func generateAuthToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}
