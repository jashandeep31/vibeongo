package utils

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestOpenCodeVersionSupported(t *testing.T) {
	cases := []struct {
		version [3]int
		want    bool
	}{
		{version: [3]int{2, 0, 28}, want: false},
		{version: [3]int{2, 1, 2}, want: false},
		{version: [3]int{2, 1, 99}, want: false},
		{version: [3]int{2, 2, 0}, want: true},
		{version: [3]int{2, 2, 1}, want: true},
		{version: [3]int{2, 3, 0}, want: true},
	}
	for _, test := range cases {
		if got := OpenCodeVersionSupported(test.version); got != test.want {
			t.Errorf("version %v: got %v, want %v", test.version, got, test.want)
		}
	}
}

func TestCheckOpenCodeVersionRejectsOldRuntime(t *testing.T) {
	bin := filepath.Join(t.TempDir(), "opencode")
	if err := os.WriteFile(bin, []byte("#!/bin/sh\nprintf 'opencode v2.1.2\\n'\n"), 0o700); err != nil {
		t.Fatal(err)
	}
	err := CheckOpenCodeVersion(bin)
	if err == nil || !strings.Contains(err.Error(), "run vibeongo provision-opencode") {
		t.Fatalf("expected actionable version error, got %v", err)
	}
}
