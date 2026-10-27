package store

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestStartWebServerRejectsOldOpenCodeBeforeRetry(t *testing.T) {
	bin := filepath.Join(t.TempDir(), "opencode")
	if err := os.WriteFile(bin, []byte("#!/bin/sh\nprintf 'opencode v2.1.2\\n'\n"), 0o700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("OPENCODE_BIN", bin)
	err := NewOpencodeWeb().StartWebServerWithRetryContext(context.Background())
	if err == nil || !strings.Contains(err.Error(), "required 2.2.0") {
		t.Fatalf("expected minimum version error, got %v", err)
	}
}

func TestWaitForOpencodeReadyRetriesHealthCheck(t *testing.T) {
	checks := 0
	ready := waitForOpencodeReady(func() bool {
		checks++
		return checks == 3
	}, time.Second, time.Millisecond)
	if !ready || checks != 3 {
		t.Fatalf("waitForOpencodeReady() = %v after %d checks, want true after 3", ready, checks)
	}
}

func TestWaitForOpencodeReadyTimesOut(t *testing.T) {
	checks := 0
	ready := waitForOpencodeReady(func() bool {
		checks++
		return false
	}, 2*time.Millisecond, time.Millisecond)
	if ready || checks < 2 {
		t.Fatalf("waitForOpencodeReady() = %v after %d checks, want timeout after retries", ready, checks)
	}
}

func TestValidateOpencodePassword(t *testing.T) {
	tests := []struct {
		name      string
		password  string
		wantError bool
	}{
		{name: "missing", password: "", wantError: true},
		{name: "blank", password: "   ", wantError: true},
		{name: "present", password: "instance-password", wantError: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateOpencodePassword(test.password)
			if (err != nil) != test.wantError {
				t.Fatalf("validateOpencodePassword() error = %v, wantError %v", err, test.wantError)
			}
		})
	}
}
