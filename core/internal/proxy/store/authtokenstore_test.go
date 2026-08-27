package store

import (
	"testing"
	"time"
)

func TestValidateTokenRequiresMatchingHost(t *testing.T) {
	now := time.Date(2026, time.August, 27, 0, 0, 0, 0, time.UTC)
	store := newAuthTokenStore(WebSocketAuthTokenTTL, func() time.Time { return now })

	token, _, err := store.NewToken("user-a.example.com")
	if err != nil {
		t.Fatalf("NewToken() error = %v", err)
	}

	if store.ValidateToken(token, "user-b.example.com") {
		t.Fatal("ValidateToken() accepted token for a different host")
	}
	if !store.ValidateToken(token, "user-a.example.com") {
		t.Fatal("ValidateToken() rejected token for its matching host")
	}
	if store.ValidateToken(token, "user-a.example.com") {
		t.Fatal("ValidateToken() accepted a consumed token")
	}
}

func TestValidateTokenRejectsExpiredToken(t *testing.T) {
	now := time.Date(2026, time.August, 27, 0, 0, 0, 0, time.UTC)
	store := newAuthTokenStore(WebSocketAuthTokenTTL, func() time.Time { return now })

	token, _, err := store.NewToken("user-a.example.com")
	if err != nil {
		t.Fatalf("NewToken() error = %v", err)
	}

	now = now.Add(WebSocketAuthTokenTTL)
	if store.ValidateToken(token, "user-a.example.com") {
		t.Fatal("ValidateToken() accepted an expired token")
	}
}
