package actions

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

func TestProvisionOpenCodeUpgradesWithoutCredentials(t *testing.T) {
	versionFile := filepath.Join(t.TempDir(), "version")
	if err := os.WriteFile(versionFile, []byte("opencode v2.0.24\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	bin := filepath.Join(t.TempDir(), "opencode")
	script := fmt.Sprintf(`#!/bin/sh
if [ "$1" = "--version" ]; then
  cat %q
elif [ "$1" = "upgrade" ] && [ "$2" = "2.0.28" ] && [ "$3" = "--method" ] && [ "$4" = "curl" ]; then
  printf 'opencode v2.0.28\n' > %q
else
  exit 2
fi
`, versionFile, versionFile)
	if err := os.WriteFile(bin, []byte(script), 0o700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("OPENCODE_BIN", bin)
	if err := ProvisionOpenCode(&config.OpenCodeConfig{}); err != nil {
		t.Fatal(err)
	}
	version, err := os.ReadFile(versionFile)
	if err != nil {
		t.Fatal(err)
	}
	if strings.TrimSpace(string(version)) != "opencode v2.0.28" {
		t.Fatalf("unexpected version: %q", version)
	}
}

func TestOpenCodeVersionSupported(t *testing.T) {
	cases := []struct {
		version [3]int
		want    bool
	}{
		{version: [3]int{2, 0, 24}, want: false},
		{version: [3]int{2, 0, 27}, want: false},
		{version: [3]int{2, 0, 28}, want: true},
		{version: [3]int{2, 0, 29}, want: true},
		{version: [3]int{2, 1, 0}, want: true},
	}
	for _, test := range cases {
		if got := openCodeVersionSupported(test.version); got != test.want {
			t.Errorf("version %v: got %v, want %v", test.version, got, test.want)
		}
	}
}
