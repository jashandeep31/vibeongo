package store

import (
	"sync/atomic"
	"testing"
	"time"
)

func TestAuthTokenStoreTokenCanOnlyBeUsedOnce(t *testing.T) {
	store := NewAuthTokenStore()
	token, expiresAt, err := store.NewToken()
	if err != nil {
		t.Fatalf("NewToken() error = %v", err)
	}
	if token == "" {
		t.Fatal("NewToken() returned an empty token")
	}
	if remaining := time.Until(expiresAt); remaining <= 29*time.Second || remaining > WebSocketAuthTokenTTL {
		t.Fatalf("token lifetime = %v, want approximately %v", remaining, WebSocketAuthTokenTTL)
	}

	if !store.ValidateToken(token) {
		t.Fatal("first ValidateToken() = false, want true")
	}
	if store.ValidateToken(token) {
		t.Fatal("second ValidateToken() = true, want false")
	}
}

func TestAuthTokenStoreRejectsExpiredToken(t *testing.T) {
	now := time.Date(2026, time.August, 25, 0, 0, 0, 0, time.UTC)
	store := newAuthTokenStore(WebSocketAuthTokenTTL, func() time.Time { return now })

	token, _, err := store.NewToken()
	if err != nil {
		t.Fatalf("NewToken() error = %v", err)
	}
	now = now.Add(WebSocketAuthTokenTTL)

	if store.ValidateToken(token) {
		t.Fatal("ValidateToken() = true for expired token, want false")
	}
}

func TestAuthTokenStoreExpireToken(t *testing.T) {
	store := NewAuthTokenStore()
	token, _, err := store.NewToken()
	if err != nil {
		t.Fatalf("NewToken() error = %v", err)
	}

	store.ExpireToken(token)
	if store.ValidateToken(token) {
		t.Fatal("ValidateToken() = true after ExpireToken(), want false")
	}
	if store.ValidateToken("") || store.ValidateToken("unknown") {
		t.Fatal("ValidateToken() accepted an empty or unknown token")
	}
}

func TestAuthTokenStoreConcurrentValidation(t *testing.T) {
	store := NewAuthTokenStore()
	token, _, err := store.NewToken()
	if err != nil {
		t.Fatalf("NewToken() error = %v", err)
	}

	var successes atomic.Int32
	done := make(chan struct{})
	for range 20 {
		go func() {
			if store.ValidateToken(token) {
				successes.Add(1)
			}
			done <- struct{}{}
		}()
	}
	for range 20 {
		<-done
	}

	if got := successes.Load(); got != 1 {
		t.Fatalf("successful validations = %d, want 1", got)
	}
}

func TestAuthTokenStoreGeneratesDistinctTokens(t *testing.T) {
	store := NewAuthTokenStore()
	first, _, err := store.NewToken()
	if err != nil {
		t.Fatalf("first NewToken() error = %v", err)
	}
	second, _, err := store.NewToken()
	if err != nil {
		t.Fatalf("second NewToken() error = %v", err)
	}
	if first == second {
		t.Fatal("NewToken() generated duplicate tokens")
	}
}
