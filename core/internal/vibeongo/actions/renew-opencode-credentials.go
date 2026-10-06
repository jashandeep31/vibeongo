package actions

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
	"strings"
	"sync"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

var opencodeRenewMu sync.Mutex

type opencodeCredential struct {
	ID            string          `json:"id"`
	IntegrationID string          `json:"integrationID"`
	Label         string          `json:"label"`
	Active        bool            `json:"active"`
	Value         json.RawMessage `json:"value"`
}

type RenewOpencodeResult struct {
	Credentials int       `json:"credentials"`
	RenewedAt   time.Time `json:"renewedAt"`
}

// RenewOpencodeCredentials fetches a new server snapshot and applies it to the live OpenCode server.
func RenewOpencodeCredentials(ctx context.Context) (RenewOpencodeResult, error) {
	if !opencodeRenewMu.TryLock() {
		return RenewOpencodeResult{}, &OpencodeAccessTokenError{Status: http.StatusConflict, Message: "Credentials are already being renewed"}
	}
	defer opencodeRenewMu.Unlock()
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return RenewOpencodeResult{}, renewalError("Runtime configuration unavailable")
	}
	return renewOpencodeCredentials(ctx, cfg, opencodeTokenClient, "http://127.0.0.1:4096", config.UpdateConfigFile, updateOpencodeModels)
}

func renewOpencodeCredentials(ctx context.Context, cfg config.Config, client *http.Client, opencodeURL string, persist func(func(map[string]json.RawMessage) error) error, updateModels func(map[string]config.VibeongoAIModel) (func() error, bool, error)) (RenewOpencodeResult, error) {
	fail := func(message string) (RenewOpencodeResult, error) { return RenewOpencodeResult{}, renewalError(message) }
	if cfg.OpenCode == nil || cfg.InstanceID == "" || cfg.SessionID == "" || cfg.InstanceConfig.SessionToken == "" || cfg.InstanceConfig.OpencodePassword == "" {
		return fail("OpenCode runtime configuration unavailable")
	}
	// The public credential APIs are available in standard OpenCode builds.
	if _, err := listOpencodeCredentials(ctx, client, opencodeURL, cfg.InstanceConfig.OpencodePassword); err != nil {
		return RenewOpencodeResult{}, err
	}
	base, err := url.Parse(cfg.ServerBaseURL)
	if err != nil || base.Host == "" || (base.Scheme != "https" && base.Scheme != "http") || base.User != nil || base.RawQuery != "" || base.Fragment != "" {
		return fail("Runtime server configuration invalid")
	}
	endpoint := strings.TrimRight(base.String(), "/") + "/api/v1/runtime/sessions/" + url.PathEscape(cfg.SessionID) + "/opencode/renew-credentials/" + url.PathEscape(cfg.InstanceID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return fail("Runtime server configuration invalid")
	}
	for key, value := range runtimeAuthHeaders(cfg) {
		req.Header.Set(key, value)
	}
	res, err := client.Do(req)
	if err != nil {
		return fail("Credential renewal unavailable; try again")
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusConflict {
		return RenewOpencodeResult{}, &OpencodeAccessTokenError{Status: http.StatusConflict, Message: "ChatGPT connection unavailable; sign in again using the Vibeongo CLI"}
	}
	if res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden {
		return RenewOpencodeResult{}, &OpencodeAccessTokenError{Status: http.StatusUnauthorized, Message: "Runtime authorization unavailable; reconnect the runtime"}
	}
	if res.StatusCode != http.StatusOK {
		return fail("Credential renewal unavailable; try again")
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, 4*1024*1024+1))
	if err != nil || len(body) > 4*1024*1024 {
		return fail("Invalid credential renewal response")
	}
	var envelope struct {
		Data struct {
			InstanceID string                            `json:"instanceId"`
			SessionID  string                            `json:"sessionId"`
			Packages   []config.PackageConfig            `json:"packages"`
			Models     map[string]config.VibeongoAIModel `json:"vibeongoAiModels"`
		} `json:"data"`
	}
	if json.Unmarshal(body, &envelope) != nil || envelope.Data.InstanceID != cfg.InstanceID || envelope.Data.SessionID != cfg.SessionID {
		return fail("Invalid credential renewal response")
	}
	var freshPackage *config.PackageConfig
	for i := range envelope.Data.Packages {
		if envelope.Data.Packages[i].Name == "opencode" {
			freshPackage = &envelope.Data.Packages[i]
			break
		}
	}
	if freshPackage == nil {
		return fail("OpenCode is no longer configured for this project")
	}
	var fresh config.OpenCodeConfig
	if json.Unmarshal(freshPackage.Config, &fresh) != nil {
		return fail("Invalid OpenCode configuration")
	}
	entries, err := decodeOpencodeCredentials(fresh.AuthJSON)
	if err != nil {
		return fail("Invalid OpenCode credentials")
	}
	previous, err := decodeOpencodeCredentials(cfg.OpenCode.AuthJSON)
	if err != nil {
		return fail("Invalid local OpenCode credentials")
	}
	wanted := make(map[string]bool)
	for _, entry := range entries {
		wanted[entry.ID] = true
	}
	removeIDs := []string{}
	for _, entry := range previous {
		if !wanted[entry.ID] {
			removeIDs = append(removeIDs, entry.ID)
		}
	}
	models := envelope.Data.Models
	if models == nil {
		models = map[string]config.VibeongoAIModel{}
	}
	rollbackCredentials, err := replaceOpencodeCredentials(ctx, client, opencodeURL, cfg.InstanceConfig.OpencodePassword, entries, removeIDs)
	if err != nil {
		return RenewOpencodeResult{}, err
	}
	undoModels, changed, err := updateModels(models)
	if err != nil {
		if rollbackCredentials() != nil {
			return fail("OpenCode renewal failed and credentials could not be restored; retry renewal")
		}
		return fail("Server credentials renewed, but OpenCode settings could not be updated; try again")
	}
	if changed {
		if err := opencodeRequest(ctx, client, opencodeURL, cfg.InstanceConfig.OpencodePassword, http.MethodPost, "/api/location/reload", nil); err != nil {
			modelRestoreErr := undoModels()
			credentialRestoreErr := rollbackCredentials()
			if modelRestoreErr != nil || credentialRestoreErr != nil {
				return fail("OpenCode renewal failed and previous settings could not be fully restored; retry renewal")
			}
			return fail("OpenCode could not reload its renewed settings; try again")
		}
	}
	if err := persist(func(document map[string]json.RawMessage) error {
		var packages []config.PackageConfig
		if err := json.Unmarshal(document["packages"], &packages); err != nil {
			return err
		}
		found := false
		for i := range packages {
			if packages[i].Name == "opencode" {
				packages[i] = *freshPackage
				found = true
			}
		}
		if !found {
			packages = append(packages, *freshPackage)
		}
		var err error
		document["packages"], err = json.Marshal(packages)
		if err != nil {
			return err
		}
		document["vibeongoAiModels"], err = json.Marshal(models)
		return err
	}); err != nil {
		return fail("OpenCode credentials updated, but local configuration could not be saved; try again")
	}
	return RenewOpencodeResult{Credentials: len(entries), RenewedAt: time.Now().UTC()}, nil
}

func renewalError(message string) error {
	return &OpencodeAccessTokenError{Status: http.StatusBadGateway, Message: message}
}

func decodeOpencodeCredentials(data json.RawMessage) ([]opencodeCredential, error) {
	entries := []opencodeCredential{}
	if len(data) == 0 || string(data) == "null" {
		return entries, nil
	}
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	ids, selected := map[string]bool{}, map[string]bool{}
	for _, entry := range entries {
		if entry.ID == "" || entry.IntegrationID == "" || ids[entry.ID] {
			return nil, fmt.Errorf("invalid credential IDs")
		}
		ids[entry.ID] = true
		if entry.Active && selected[entry.IntegrationID] {
			return nil, fmt.Errorf("invalid credential selection")
		}
		if entry.Active {
			selected[entry.IntegrationID] = true
		}
		var value struct {
			Type    string `json:"type"`
			Access  string `json:"access"`
			Refresh string `json:"refresh"`
			Expires int64  `json:"expires"`
			Key     string `json:"key"`
		}
		if json.Unmarshal(entry.Value, &value) != nil {
			return nil, fmt.Errorf("invalid credential value")
		}
		if value.Type == "oauth" {
			if value.Access == "" || value.Refresh == "" || value.Expires < 0 {
				return nil, fmt.Errorf("invalid OAuth credential")
			}
		} else if value.Type != "key" || value.Key == "" {
			return nil, fmt.Errorf("invalid credential type")
		}
	}
	return entries, nil
}

func opencodeRequest(ctx context.Context, client *http.Client, baseURL, password, method, path string, payload any) error {
	_, err := opencodeResponse(ctx, client, baseURL, password, method, path, payload)
	return err
}

func opencodeResponse(ctx context.Context, client *http.Client, baseURL, password, method, path string, payload any) ([]byte, error) {
	var body []byte
	var err error
	if payload != nil {
		body, err = json.Marshal(payload)
	}
	if err != nil {
		return nil, renewalError("Invalid OpenCode request")
	}
	req, err := http.NewRequestWithContext(ctx, method, baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, renewalError("Invalid OpenCode request")
	}
	req.SetBasicAuth("opencode", password)
	req.Header.Set("Content-Type", "application/json")
	res, err := client.Do(req)
	if err != nil {
		return nil, &OpencodeAccessTokenError{Status: http.StatusServiceUnavailable, Message: "OpenCode is not reachable. Start or restart OpenCode, then try again"}
	}
	defer res.Body.Close()
	switch res.StatusCode {
	case http.StatusOK, http.StatusCreated, http.StatusNoContent:
		data, err := io.ReadAll(io.LimitReader(res.Body, 4*1024*1024+1))
		if err != nil || len(data) > 4*1024*1024 {
			return nil, renewalError("Invalid OpenCode response")
		}
		return data, nil
	case http.StatusNotFound, http.StatusMethodNotAllowed:
		return nil, renewalError("The running OpenCode server does not expose the required credential API")
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, renewalError("OpenCode authentication failed. Reconnect the runtime, then try again")
	default:
		return nil, renewalError("OpenCode could not apply the update; try again")
	}
}

func listOpencodeCredentials(ctx context.Context, client *http.Client, baseURL, password string) ([]opencodeCredential, error) {
	body, err := opencodeResponse(ctx, client, baseURL, password, http.MethodGet, "/api/credential", nil)
	if err != nil {
		return nil, err
	}
	var result struct {
		Data json.RawMessage `json:"data"`
	}
	if json.Unmarshal(body, &result) != nil || len(result.Data) == 0 || bytes.Equal(result.Data, []byte("null")) {
		return nil, renewalError("Invalid OpenCode credential response")
	}
	entries, err := decodeOpencodeCredentials(result.Data)
	if err != nil {
		return nil, renewalError("Invalid OpenCode credential response")
	}
	return entries, nil
}

func replaceOpencodeCredentials(ctx context.Context, client *http.Client, baseURL, password string, entries []opencodeCredential, removeIDs []string) (func() error, error) {
	current, err := listOpencodeCredentials(ctx, client, baseURL, password)
	if err != nil {
		return nil, err
	}
	originals := map[string]opencodeCredential{}
	integrations := map[string]bool{}
	for _, entry := range current {
		originals[entry.ID] = entry
	}
	for _, entry := range entries {
		if old, ok := originals[entry.ID]; ok && old.IntegrationID != entry.IntegrationID {
			return nil, renewalError("OpenCode credential integration does not match the server configuration")
		}
		integrations[entry.IntegrationID] = true
	}
	for _, id := range removeIDs {
		if old, ok := originals[id]; ok {
			integrations[old.IntegrationID] = true
		}
	}
	touched := []string{}
	restore := func() error {
		restoreCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		live, err := listOpencodeCredentials(restoreCtx, client, baseURL, password)
		if err != nil {
			return err
		}
		exists := map[string]bool{}
		for _, entry := range live {
			exists[entry.ID] = true
		}
		for i := len(touched) - 1; i >= 0; i-- {
			id := touched[i]
			if exists[id] {
				if err := opencodeRequest(restoreCtx, client, baseURL, password, http.MethodDelete, "/api/credential/"+url.PathEscape(id), nil); err != nil {
					return err
				}
			}
			if old, ok := originals[id]; ok {
				if err := createOpencodeCredential(restoreCtx, client, baseURL, password, old); err != nil {
					return err
				}
			}
		}
		for _, entry := range current {
			if entry.Active && integrations[entry.IntegrationID] {
				if err := opencodeRequest(restoreCtx, client, baseURL, password, http.MethodPost, "/api/credential/"+url.PathEscape(entry.ID)+"/activate", nil); err != nil {
					return err
				}
			}
		}
		return nil
	}
	fail := func(err error) (func() error, error) {
		if restore() != nil {
			return nil, renewalError("OpenCode credentials could not be restored; retry renewal")
		}
		return nil, err
	}
	for _, entry := range entries {
		old, exists := originals[entry.ID]
		if exists && old.Label == entry.Label && equalCredentialValue(old.Value, entry.Value) {
			continue
		}
		touched = append(touched, entry.ID)
		if exists {
			if err := opencodeRequest(ctx, client, baseURL, password, http.MethodDelete, "/api/credential/"+url.PathEscape(entry.ID), nil); err != nil {
				return fail(err)
			}
		}
		if err := createOpencodeCredential(ctx, client, baseURL, password, entry); err != nil {
			return fail(err)
		}
	}
	for _, entry := range entries {
		if entry.Active {
			if err := opencodeRequest(ctx, client, baseURL, password, http.MethodPost, "/api/credential/"+url.PathEscape(entry.ID)+"/activate", nil); err != nil {
				return fail(err)
			}
		}
	}
	// Only IDs previously supplied by our server may be removed.
	for _, id := range removeIDs {
		if _, exists := originals[id]; !exists {
			continue
		}
		touched = append(touched, id)
		if err := opencodeRequest(ctx, client, baseURL, password, http.MethodDelete, "/api/credential/"+url.PathEscape(id), nil); err != nil {
			return fail(err)
		}
	}
	return restore, nil
}

func createOpencodeCredential(ctx context.Context, client *http.Client, baseURL, password string, entry opencodeCredential) error {
	return opencodeRequest(ctx, client, baseURL, password, http.MethodPost, "/api/credential", map[string]any{"id": entry.ID, "integrationID": entry.IntegrationID, "label": entry.Label, "value": entry.Value, "activate": false})
}

func equalCredentialValue(a, b json.RawMessage) bool {
	var left, right any
	if json.Unmarshal(a, &left) != nil || json.Unmarshal(b, &right) != nil {
		return false
	}
	x, _ := json.Marshal(left)
	y, _ := json.Marshal(right)
	return bytes.Equal(x, y)
}

func updateOpencodeModels(models map[string]config.VibeongoAIModel) (func() error, bool, error) {
	filename := os.Getenv("OPENCODE_CONFIG")
	if filename == "" {
		filename = utils.ReplaceUsernamePlaceholder("/home/_USERNAME_/.config/opencode/opencode.json")
	}
	return updateOpencodeModelsFile(filename, models)
}

func updateOpencodeModelsFile(filename string, models map[string]config.VibeongoAIModel) (func() error, bool, error) {
	original, err := os.ReadFile(filename)
	if err != nil {
		return nil, false, err
	}
	info, err := os.Stat(filename)
	if err != nil {
		return nil, false, err
	}
	var document map[string]json.RawMessage
	if err := json.Unmarshal(original, &document); err != nil {
		return nil, false, err
	}
	var providers map[string]json.RawMessage
	if err := json.Unmarshal(document["providers"], &providers); err != nil {
		return nil, false, err
	}
	var provider map[string]json.RawMessage
	if err := json.Unmarshal(providers["vibeongo_ai"], &provider); err != nil || provider == nil {
		return nil, false, fmt.Errorf("Vibeongo AI provider is missing")
	}
	value, err := json.Marshal(models)
	if err != nil {
		return nil, false, err
	}
	if equalCredentialValue(provider["models"], value) {
		return func() error { return nil }, false, nil
	}
	provider["models"] = value
	providers["vibeongo_ai"], err = json.Marshal(provider)
	if err != nil {
		return nil, false, err
	}
	document["providers"], err = json.Marshal(providers)
	if err != nil {
		return nil, false, err
	}
	updated, err := json.MarshalIndent(document, "", "  ")
	if err != nil {
		return nil, false, err
	}
	write := func(data []byte) error {
		tmp, err := os.CreateTemp(filepath.Dir(filename), ".opencode-models-*.json")
		if err != nil {
			return err
		}
		defer os.Remove(tmp.Name())
		if err := tmp.Chmod(info.Mode().Perm()); err != nil {
			tmp.Close()
			return err
		}
		if _, err := tmp.Write(data); err != nil {
			tmp.Close()
			return err
		}
		if err := tmp.Sync(); err != nil {
			tmp.Close()
			return err
		}
		if err := tmp.Close(); err != nil {
			return err
		}
		return os.Rename(tmp.Name(), filename)
	}
	if err := write(append(updated, '\n')); err != nil {
		return nil, false, err
	}
	return func() error { return write(original) }, true, nil
}
