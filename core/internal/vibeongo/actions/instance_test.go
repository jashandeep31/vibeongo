package actions

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

func TestTerminateInstance(t *testing.T) {
	for _, tc := range []struct {
		name    string
		status  int
		body    string
		wantErr bool
	}{
		{"terminated", http.StatusOK, `{"data":"Instance terminated"}`, false},
		{"queued", http.StatusAccepted, `{"data":"Your termination request is being processed."}`, false},
		{"rejected", http.StatusConflict, `{"error":"Termination failed"}`, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodGet || r.URL.Path != "/api/v1/runtime/sessions/session/terminate/instance" {
					t.Errorf("unexpected request: %s %s", r.Method, r.URL.Path)
				}
				if r.Header.Get("Authorization") != "Bearer token" || r.Header.Get("X-Instance-Id") != "instance" {
					t.Error("missing runtime authentication headers")
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer server.Close()

			err := TerminateInstance(config.Config{
				ServerBaseURL: server.URL,
				SessionID:     "session",
				InstanceID:    "instance",
				InstanceConfig: config.InstanceConfig{
					Terminate:    true,
					SessionToken: "token",
				},
			}, false)
			if (err != nil) != tc.wantErr {
				t.Fatalf("TerminateInstance() error = %v, want error = %v", err, tc.wantErr)
			}
		})
	}
}
