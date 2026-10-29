package store

import (
	"testing"
	"time"
)

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
