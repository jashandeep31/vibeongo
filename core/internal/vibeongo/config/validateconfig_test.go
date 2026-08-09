package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestDisableTerminateAfterDone(t *testing.T) {
	originalConfigPath := configPath
	configPath = filepath.Join(t.TempDir(), "config.json")
	t.Cleanup(func() {
		configPath = originalConfigPath
	})

	initialConfig := []byte(`{
  "projectId": "project-1",
  "instanceConfig": {
    "terminate": true,
    "vibeongoLocalToken": "local-token",
    "sessionToken": "session-token"
  }
}`)
	if err := os.WriteFile(configPath, initialConfig, 0o600); err != nil {
		t.Fatalf("write test config: %v", err)
	}

	if err := DisableTerminateAfterDone(); err != nil {
		t.Fatalf("disable terminate after done: %v", err)
	}

	updatedConfig, err := LoadAndValidate()
	if err != nil {
		t.Fatalf("load updated config: %v", err)
	}
	if updatedConfig.InstanceConfig.Terminate {
		t.Fatal("expected terminate to be false")
	}
	if updatedConfig.ProjectID != "project-1" {
		t.Fatalf("expected unrelated config to be preserved, got projectId %q", updatedConfig.ProjectID)
	}

	file, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read updated config: %v", err)
	}
	var rawConfig map[string]json.RawMessage
	if err := json.Unmarshal(file, &rawConfig); err != nil {
		t.Fatalf("parse updated config: %v", err)
	}
	if _, ok := rawConfig["projectId"]; !ok {
		t.Fatal("expected projectId to remain in raw config")
	}
}
