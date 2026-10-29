package actions

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

func TestProvisionOpenCodeWithoutVersionChecks(t *testing.T) {
	for _, auth := range []string{"", "null", "[]", `[{"id":"test"}]`} {
		t.Run(auth, func(t *testing.T) {
			dir := t.TempDir()
			bin := filepath.Join(dir, "opencode")
			imported := filepath.Join(dir, "imported")
			// A runtime without version or upgrade commands can still import credentials.
			script := `#!/bin/sh
if [ "$#" = 3 ] && [ "$1" = auth ] && [ "$2" = import ] && [ "$3" = --standalone ]; then
  cat > "$OPENCODE_TEST_IMPORTED"
else
  exit 2
fi
`
			if err := os.WriteFile(bin, []byte(script), 0o700); err != nil {
				t.Fatal(err)
			}
			t.Setenv("OPENCODE_BIN", bin)
			t.Setenv("OPENCODE_TEST_IMPORTED", imported)
			if err := ProvisionOpenCode(&config.OpenCodeConfig{AuthJSON: []byte(auth)}); err != nil {
				t.Fatal(err)
			}
			data, err := os.ReadFile(imported)
			if auth == "" || auth == "null" || auth == "[]" {
				if !os.IsNotExist(err) {
					t.Fatalf("expected no credential import, got %q, error %v", data, err)
				}
				return
			}
			if err != nil || string(data) != auth {
				t.Fatalf("credential import = %q, error %v; want %q", data, err, auth)
			}
		})
	}
}
