package actions

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

// Only these fields may cross the private OpenCode bridge.
type OpencodeAccessToken struct {
	AccessToken string    `json:"access_token"`
	ExpiresAt   time.Time `json:"access_token_expires_at"`
}

type OpencodeAccessTokenError struct {
	Status  int
	Message string
}

func (e *OpencodeAccessTokenError) Error() string { return e.Message }

var opencodeTokenClient = &http.Client{
	Timeout:       30 * time.Second,
	CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
}

func GetOpencodeAccessToken(ctx context.Context) (OpencodeAccessToken, error) {
	// Keep automatic bridge requests outside manual credential replacement.
	opencodeRenewMu.Lock()
	defer opencodeRenewMu.Unlock()
	var result OpencodeAccessToken
	fail := func(status int, message string) (OpencodeAccessToken, error) {
		return result, &OpencodeAccessTokenError{Status: status, Message: message}
	}
	if ctx.Err() != nil {
		return fail(http.StatusServiceUnavailable, "ChatGPT renewal cancelled; try again")
	}
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return fail(http.StatusServiceUnavailable, "Runtime configuration unavailable")
	}
	if cfg.SessionID == "" || cfg.InstanceID == "" || cfg.InstanceConfig.SessionToken == "" {
		return fail(http.StatusServiceUnavailable, "Runtime authentication unavailable")
	}
	base, err := url.Parse(cfg.ServerBaseURL)
	if err != nil || base.Host == "" || (base.Scheme != "https" && base.Scheme != "http") || base.User != nil || base.RawQuery != "" || base.Fragment != "" {
		return fail(http.StatusServiceUnavailable, "Runtime server configuration invalid")
	}
	endpoint := strings.TrimRight(base.String(), "/") + "/api/v1/runtime/sessions/" + url.PathEscape(cfg.SessionID) + "/provider-credentials/codex/access-token"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return fail(http.StatusServiceUnavailable, "Runtime server configuration invalid")
	}
	for key, value := range runtimeAuthHeaders(cfg) {
		req.Header.Set(key, value)
	}
	res, err := opencodeTokenClient.Do(req)
	if err != nil {
		return fail(http.StatusBadGateway, "ChatGPT renewal unavailable; try again")
	}
	defer res.Body.Close()
	switch res.StatusCode {
	case http.StatusUnauthorized, http.StatusForbidden:
		return fail(http.StatusUnauthorized, "Runtime authorization expired; reconnect the runtime")
	case http.StatusNotFound, http.StatusConflict:
		return fail(http.StatusConflict, "ChatGPT connection unavailable; sign in again with the Vibeongo CLI")
	}
	if res.StatusCode != http.StatusOK {
		return fail(http.StatusBadGateway, "ChatGPT renewal unavailable; try again")
	}
	// Never include upstream bodies or decoder errors in a response or log.
	const limit = 64 * 1024
	body, err := io.ReadAll(io.LimitReader(res.Body, limit+1))
	if err != nil || len(body) > limit {
		return fail(http.StatusBadGateway, "Invalid ChatGPT renewal response")
	}
	var envelope struct {
		Data OpencodeAccessToken `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil || strings.TrimSpace(envelope.Data.AccessToken) == "" || !envelope.Data.ExpiresAt.After(time.Now()) {
		return fail(http.StatusBadGateway, "Invalid ChatGPT renewal response")
	}
	return envelope.Data, nil
}

func OpencodeAccessTokenFailure(err error) (int, string) {
	var failure *OpencodeAccessTokenError
	if errors.As(err, &failure) {
		return failure.Status, failure.Message
	}
	return http.StatusBadGateway, "ChatGPT renewal unavailable; try again"
}
