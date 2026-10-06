package actions

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

func keyCredential(id, key string, active bool) opencodeCredential {
	return opencodeCredential{ID: id, IntegrationID: "openai", Label: id, Active: active, Value: json.RawMessage(`{"type":"key","key":"` + key + `"}`)}
}

func credentialServer(t *testing.T, entries []opencodeCredential, failCreate bool, failReload bool) (*httptest.Server, map[string]opencodeCredential, *int) {
	t.Helper()
	rows := map[string]opencodeCredential{}
	for _, entry := range entries {
		rows[entry.ID] = entry
	}
	reloads := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, password, ok := r.BasicAuth()
		if !ok || user != "opencode" || password != "password" {
			t.Error("OpenCode authentication missing")
			w.WriteHeader(401)
			return
		}
		switch {
		case r.URL.Path == "/api/credential" && r.Method == http.MethodGet:
			list := []opencodeCredential{}
			for _, entry := range rows {
				list = append(list, entry)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"data": list})
		case r.URL.Path == "/api/credential" && r.Method == http.MethodPost:
			var input struct {
				ID            string          `json:"id"`
				IntegrationID string          `json:"integrationID"`
				Label         string          `json:"label"`
				Value         json.RawMessage `json:"value"`
				Activate      bool            `json:"activate"`
			}
			if json.NewDecoder(r.Body).Decode(&input) != nil {
				t.Error("invalid create payload")
				w.WriteHeader(400)
				return
			}
			if failCreate && strings.Contains(string(input.Value), "new-access") {
				failCreate = false
				w.WriteHeader(500)
				return
			}
			if _, exists := rows[input.ID]; exists {
				w.WriteHeader(409)
				return
			}
			rows[input.ID] = opencodeCredential{ID: input.ID, IntegrationID: input.IntegrationID, Label: input.Label, Value: input.Value, Active: input.Activate}
			_ = json.NewEncoder(w).Encode(map[string]any{"data": rows[input.ID]})
		case strings.HasSuffix(r.URL.Path, "/activate") && r.Method == http.MethodPost:
			id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/credential/"), "/activate")
			selected := rows[id]
			for key, entry := range rows {
				if entry.IntegrationID == selected.IntegrationID {
					entry.Active = key == id
					rows[key] = entry
				}
			}
			w.WriteHeader(204)
		case strings.HasPrefix(r.URL.Path, "/api/credential/") && r.Method == http.MethodDelete:
			delete(rows, strings.TrimPrefix(r.URL.Path, "/api/credential/"))
			w.WriteHeader(204)
		case r.URL.Path == "/api/location/reload" && r.Method == http.MethodPost:
			reloads++
			if failReload {
				w.WriteHeader(500)
			} else {
				w.WriteHeader(204)
			}
		default:
			t.Errorf("unexpected endpoint %s %s", r.Method, r.URL.Path)
			w.WriteHeader(404)
		}
	}))
	return server, rows, &reloads
}

func TestRenewOpencodeCredentialsUsesPublicAPIs(t *testing.T) {
	old := keyCredential("cred_managed", "old-access", true)
	stale := keyCredential("cred_removed", "stale", false)
	local := keyCredential("cred_local", "keep-local", false)
	fresh := keyCredential("cred_managed", "new-access", true)
	newAuth, _ := json.Marshal([]opencodeCredential{fresh})
	oldAuth, _ := json.Marshal([]opencodeCredential{old, stale})
	newPackage, _ := json.Marshal(config.OpenCodeConfig{AuthJSON: newAuth})
	platform := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/v1/runtime/sessions/session/opencode/renew-credentials/instance" || r.Header.Get("Authorization") != "Bearer session-token" || r.Header.Get("X-Instance-Id") != "instance" {
			t.Error("unexpected platform renewal request")
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"instanceId": "instance", "sessionId": "session", "packages": []config.PackageConfig{{Name: "opencode", Config: newPackage}}, "vibeongoAiModels": map[string]any{"model": map[string]string{"name": "Model"}}}})
	}))
	defer platform.Close()
	opencode, rows, reloads := credentialServer(t, []opencodeCredential{old, stale, local}, false, false)
	defer opencode.Close()
	cfg := config.Config{ServerBaseURL: platform.URL, SessionID: "session", InstanceID: "instance", OpenCode: &config.OpenCodeConfig{AuthJSON: oldAuth}, InstanceConfig: config.InstanceConfig{SessionToken: "session-token", OpencodePassword: "password"}}
	packages, _ := json.Marshal([]config.PackageConfig{{Name: "opencode", Config: json.RawMessage(`{"auth_json":[]}`)}, {Name: "codex", Config: json.RawMessage(`{}`)}})
	document := map[string]json.RawMessage{"packages": packages, "devScript": json.RawMessage(`"keep me"`)}
	modelFile := filepath.Join(t.TempDir(), "opencode.json")
	if err := os.WriteFile(modelFile, []byte(`{"shell":"/bin/bash","providers":{"vibeongo_ai":{"name":"Vibeongo AI","settings":{"baseURL":"https://openrouter.ai/api/v1"},"models":{}}}}`), 0600); err != nil {
		t.Fatal(err)
	}
	result, err := renewOpencodeCredentials(context.Background(), cfg, platform.Client(), opencode.URL, func(update func(map[string]json.RawMessage) error) error { return update(document) }, func(models map[string]config.VibeongoAIModel) (func() error, bool, error) {
		return updateOpencodeModelsFile(modelFile, models)
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Credentials != 1 || *reloads != 1 {
		t.Fatalf("unexpected result: %+v reloads %d", result, *reloads)
	}
	if len(rows) != 2 || !equalCredentialValue(rows[old.ID].Value, fresh.Value) || !rows[old.ID].Active || !equalCredentialValue(rows[local.ID].Value, local.Value) {
		t.Fatalf("credential snapshot not correctly applied")
	}
	if string(document["devScript"]) != `"keep me"` || !strings.Contains(string(document["packages"]), "codex") || !strings.Contains(string(document["packages"]), "new-access") {
		t.Fatal("local configuration not merged correctly")
	}
	saved, err := os.ReadFile(modelFile)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(saved), "/bin/bash") || !strings.Contains(string(saved), "https://openrouter.ai/api/v1") || !strings.Contains(string(saved), "Model") {
		t.Fatal("model patch did not preserve settings")
	}
}

func TestReplaceOpencodeCredentialsRestoresFailedReplacement(t *testing.T) {
	old := keyCredential("cred_managed", "old-access", true)
	local := keyCredential("cred_local", "keep-local", false)
	fresh := keyCredential(old.ID, "new-access", true)
	server, rows, _ := credentialServer(t, []opencodeCredential{old, local}, true, false)
	defer server.Close()
	_, err := replaceOpencodeCredentials(context.Background(), server.Client(), server.URL, "password", []opencodeCredential{fresh}, nil)
	if err == nil {
		t.Fatal("failed creation accepted")
	}
	if len(rows) != 2 || !rows[old.ID].Active || !equalCredentialValue(rows[old.ID].Value, old.Value) || !equalCredentialValue(rows[local.ID].Value, local.Value) {
		t.Fatal("credentials not restored after creation failure")
	}
}

func TestReplaceOpencodeCredentialsRejectsIntegrationCollision(t *testing.T) {
	old := keyCredential("cred_managed", "old-access", true)
	fresh := keyCredential(old.ID, "new-access", true)
	fresh.IntegrationID = "another"
	server, rows, _ := credentialServer(t, []opencodeCredential{old}, false, false)
	defer server.Close()
	_, err := replaceOpencodeCredentials(context.Background(), server.Client(), server.URL, "password", []opencodeCredential{fresh}, nil)
	if err == nil || !equalCredentialValue(rows[old.ID].Value, old.Value) {
		t.Fatal("integration collision changed credentials")
	}
}

func TestRenewOpencodeCredentialsChecksAvailabilityBeforeRenewal(t *testing.T) {
	calls := 0
	platform := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls++; w.WriteHeader(500) }))
	defer platform.Close()
	opencode := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(401)
		_, _ = w.Write([]byte("sensitive upstream detail"))
	}))
	defer opencode.Close()
	cfg := config.Config{ServerBaseURL: platform.URL, SessionID: "session", InstanceID: "instance", OpenCode: &config.OpenCodeConfig{}, InstanceConfig: config.InstanceConfig{SessionToken: "session-token", OpencodePassword: "password"}}
	_, err := renewOpencodeCredentials(context.Background(), cfg, platform.Client(), opencode.URL, func(func(map[string]json.RawMessage) error) error { t.Fatal("must not persist"); return nil }, func(map[string]config.VibeongoAIModel) (func() error, bool, error) {
		t.Fatal("must not update models")
		return nil, false, nil
	})
	if err == nil || calls != 0 || strings.Contains(err.Error(), "sensitive") {
		t.Fatalf("unexpected result %v calls %d", err, calls)
	}
}

func TestUpdateOpencodeModelsSkipsUnchangedAndCanRestore(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "opencode.json")
	original := []byte(`{"shell":"/bin/bash","providers":{"vibeongo_ai":{"models":{"old":{"name":"Old"}}}}}`)
	if err := os.WriteFile(filename, original, 0600); err != nil {
		t.Fatal(err)
	}
	_, changed, err := updateOpencodeModelsFile(filename, map[string]config.VibeongoAIModel{"old": {Name: "Old"}})
	if err != nil || changed {
		t.Fatalf("unchanged models rewritten: %v", err)
	}
	undo, changed, err := updateOpencodeModelsFile(filename, map[string]config.VibeongoAIModel{"new": {Name: "New"}})
	if err != nil || !changed {
		t.Fatalf("models not updated: %v", err)
	}
	if err := undo(); err != nil {
		t.Fatal(err)
	}
	saved, _ := os.ReadFile(filename)
	if string(saved) != string(original) {
		t.Fatal("original config not restored")
	}
}

func TestDecodeOpencodeCredentialsRejectsDuplicateSelection(t *testing.T) {
	_, err := decodeOpencodeCredentials(json.RawMessage(`[{"id":"a","integrationID":"openai","active":true,"value":{"type":"key","key":"a"}},{"id":"b","integrationID":"openai","active":true,"value":{"type":"key","key":"b"}}]`))
	if err == nil {
		t.Fatal("duplicate active credentials accepted")
	}
}

// Run against an isolated unmodified OpenCode server; never point this at a user runtime.
func TestRenewOpencodeCredentialsAgainstOpenCode(t *testing.T) {
	baseURL := os.Getenv("VIBEONGO_TEST_OPENCODE_URL")
	if baseURL == "" {
		t.Skip("isolated OpenCode integration server not configured")
	}
	ctx := context.Background()
	client := &http.Client{}
	old := keyCredential("cred_renew_test", "old-access", true)
	local := keyCredential("cred_renew_local", "local-access", false)
	for _, entry := range []opencodeCredential{old, local} {
		if err := createOpencodeCredential(ctx, client, baseURL, "password", entry); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() {
			_ = opencodeRequest(ctx, client, baseURL, "password", http.MethodDelete, "/api/credential/"+entry.ID, nil)
		})
	}
	if err := opencodeRequest(ctx, client, baseURL, "password", http.MethodPost, "/api/credential/"+old.ID+"/activate", nil); err != nil {
		t.Fatal(err)
	}
	fresh := keyCredential(old.ID, "new-access", true)
	newAuth, _ := json.Marshal([]opencodeCredential{fresh})
	oldAuth, _ := json.Marshal([]opencodeCredential{old})
	packageConfig, _ := json.Marshal(config.OpenCodeConfig{AuthJSON: newAuth})
	platform := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"instanceId": "instance", "sessionId": "session", "packages": []config.PackageConfig{{Name: "opencode", Config: packageConfig}}, "vibeongoAiModels": map[string]any{"renew-test-model": map[string]string{"name": "Renewed Model"}}}})
	}))
	defer platform.Close()
	cfg := config.Config{ServerBaseURL: platform.URL, SessionID: "session", InstanceID: "instance", OpenCode: &config.OpenCodeConfig{AuthJSON: oldAuth}, InstanceConfig: config.InstanceConfig{SessionToken: "session-token", OpencodePassword: "password"}}
	filename := filepath.Join(os.Getenv("VIBEONGO_TEST_OPENCODE_CONFIG_DIR"), "opencode.json")
	if err := os.MkdirAll(filepath.Dir(filename), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filename, []byte(`{"shell":"/bin/bash","providers":{"vibeongo_ai":{"name":"Vibeongo AI","models":{}}}}`), 0600); err != nil {
		t.Fatal(err)
	}
	document := map[string]json.RawMessage{"packages": json.RawMessage(`[]`)}
	_, err := renewOpencodeCredentials(ctx, cfg, client, baseURL, func(update func(map[string]json.RawMessage) error) error { return update(document) }, func(models map[string]config.VibeongoAIModel) (func() error, bool, error) {
		return updateOpencodeModelsFile(filename, models)
	})
	if err != nil {
		t.Fatal(err)
	}
	entries, err := listOpencodeCredentials(ctx, client, baseURL, "password")
	if err != nil {
		t.Fatal(err)
	}
	found := map[string]opencodeCredential{}
	for _, entry := range entries {
		found[entry.ID] = entry
	}
	if !equalCredentialValue(found[old.ID].Value, fresh.Value) || !found[old.ID].Active || !equalCredentialValue(found[local.ID].Value, local.Value) {
		t.Fatal("live OpenCode credentials did not match renewed snapshot")
	}
	body, err := opencodeResponse(ctx, client, baseURL, "password", http.MethodGet, "/api/config", nil)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(body), "Renewed Model") || !strings.Contains(string(body), "/bin/bash") {
		t.Fatal("live OpenCode did not reload provider settings")
	}
}
