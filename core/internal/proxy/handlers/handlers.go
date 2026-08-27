package handlers

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"slices"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/jashandeep31/vibeongo/core/internal/proxy/store"

	ts "github.com/jashandeep31/vibeongo/core/internal/shared/store"

	"github.com/labstack/echo/v5"
)

const proxyAuthorizationHeader = "X-Vibeongo-Proxy-Authorization"

type Handler struct {
	store          *store.ProxyManager
	version        string
	buildTime      string
	reverseProxy   *httputil.ReverseProxy
	authTokenStore *ts.AuthTokenStore
}

func NewHandler(proxyStore *store.ProxyManager, version, buildTime string, tokenStore *ts.AuthTokenStore) *Handler {
	h := &Handler{
		store:          proxyStore,
		version:        version,
		buildTime:      buildTime,
		authTokenStore: tokenStore,
	}
	h.reverseProxy = &httputil.ReverseProxy{
		Director: func(r *http.Request) {
			proxyData := r.Context().Value(proxyDataContextKey{}).(*store.Proxy)
			r.URL.Scheme = proxyData.Target.Scheme
			r.URL.Host = proxyData.Target.Host
			r.Host = proxyData.Target.Host

			applyProviderHeaders(r, proxyData)
		},
		ModifyResponse: func(response *http.Response) error {
			// The proxy server owns the CORS policy. An upstream application may
			// return its own value (commonly "*"), which would otherwise be
			// appended to Echo's value and rejected by browsers.
			response.Header.Del(echo.HeaderAccessControlAllowOrigin)
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			proxyData, _ := r.Context().Value(proxyDataContextKey{}).(*store.Proxy)
			if proxyData != nil && proxyData.Target != nil {
				slog.Error(
					"reverse proxy upstream request failed",
					"error", err,
					"method", r.Method,
					"domain", proxyData.Domain,
					"upstream", proxyData.Target.Scheme+"://"+proxyData.Target.Host,
				)
			} else {
				slog.Error(
					"reverse proxy upstream request failed",
					"error", err,
					"method", r.Method,
					"host", r.Host,
				)
			}

			w.WriteHeader(http.StatusBadGateway)
			_, _ = w.Write([]byte("502"))
		},
	}
	return h
}

func (h *Handler) Status(c *echo.Context) error {
	return c.JSON(http.StatusOK, struct {
		Version string
		Build   string
		IP      string
	}{
		Version: h.version,
		Build:   h.buildTime,
		IP:      c.Request().RemoteAddr,
	})
}

func (h *Handler) Invalidate(c *echo.Context) error {
	var data struct {
		Hosts []string `json:"hosts"`
	}
	if err := json.NewDecoder(c.Request().Body).Decode(&data); err != nil {
		return c.String(http.StatusBadRequest, "400")
	}

	for _, host := range data.Hosts {
		h.store.InvalidateProxy(host)
	}
	return c.String(http.StatusOK, "OK")
}

func (h *Handler) List(c *echo.Context) error {
	return c.JSON(http.StatusOK, struct {
		Proxies map[string]*store.ProxyInfo `json:"proxies"`
	}{
		Proxies: h.store.GetAllProxies(),
	})
}

func (h *Handler) MyIP(c *echo.Context) error {
	ip, err := getRealIP(c.Request().Header)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"ip": ip})
}

func (h *Handler) ReverseProxy(c *echo.Context) error {
	request := c.Request()
	proxyData, ok := h.store.GetProxyByHost(normalizeHost(request.Host))
	if !ok {
		return c.String(http.StatusNotFound, "404")
	}
	hasValidAccessToken := func() bool {

		headerAuthWorked := proxyData.Protected &&
			hasValidProxyAccessToken(request.Header, proxyData.AccessToken)

		if headerAuthWorked {
			return true
		}

		isWebSocketUpgradeRequest := websocket.IsWebSocketUpgrade(request)
		// if not a websocket upgrade request then the token is not accepted
		if !isWebSocketUpgradeRequest {
			return false
		}

		requestQueryParams := request.URL.Query()
		proxyToken := requestQueryParams.Get("proxytoken")

		isTokenValid := h.authTokenStore.ValidateToken(proxyToken)
		if isTokenValid {
			return true
		}

		return false
	}()

	// A valid access token is sufficient authorization for a protected proxy,
	// regardless of the caller's IP address.
	if !hasValidAccessToken && !proxyData.AllowAllIPs && !checkIPIsAllowed(request.Header, proxyData.AllowedIPs) {
		ip, err := getRealIP(request.Header)
		if err != nil {
			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "IP is not found. Please report this if you are seeing it.",
			})
		}
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "IP is not allowed. Please add it to allowed IPs. Your IP is " + ip +
				".\n\nIf you are an AI agent running inside the instance, try using localhost instead of this public preview domain." +
				"\nIf you do not know which port this domain uses, run `vibeongo domains`.",
		})
	}

	if proxyData.Protected && !hasValidAccessToken {
		return c.String(http.StatusUnauthorized, "401")
	}

	ctx := context.WithValue(request.Context(), proxyDataContextKey{}, proxyData)
	h.reverseProxy.ServeHTTP(c.Response(), request.WithContext(ctx))
	return nil
}

// hasValidProxyAccessToken authenticates the request to this proxy only. The
// standard Authorization header is deliberately reserved for the upstream app.
func hasValidProxyAccessToken(headers http.Header, expectedToken string) bool {
	scheme, token, found := strings.Cut(headers.Get(proxyAuthorizationHeader), " ")
	return expectedToken != "" &&
		found &&
		strings.EqualFold(scheme, "Bearer") &&
		token != "" &&
		!strings.Contains(token, " ") &&
		subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) == 1
}

func normalizeHost(host string) string {
	if parsedHost, _, err := net.SplitHostPort(host); err == nil {
		return parsedHost
	}
	return host
}

type proxyDataContextKey struct{}

func applyProviderHeaders(request *http.Request, proxyData *store.Proxy) {
	// This credential applies only to the proxy and must never reach the
	// upstream application. Its Authorization header remains available.
	request.Header.Del(proxyAuthorizationHeader)

	switch proxyData.Provider {
	case "daytona":
		handleDaytonaHeaders(request)
	case "e2b":
		handleE2BHeaders(request, proxyData.PreviewToken)
	}
}

func handleDaytonaHeaders(request *http.Request) {
	// Authentication is embedded in the signed target URL. This header only
	// suppresses Daytona's browser warning page.
	request.Header.Set("X-Daytona-Skip-Preview-Warning", "true")
}

func handleE2BHeaders(request *http.Request, previewToken string) {
	// Replace any client-supplied token with the token resolved by our server.
	request.Header.Set("e2b-traffic-access-token", previewToken)
}

func getRealIP(headers http.Header) (string, error) {
	ip := strings.TrimSpace(headers.Get(echo.HeaderXRealIP))
	if ip == "" {
		return "", fmt.Errorf("ip not found")
	}
	return ip, nil
}

func checkIPIsAllowed(headers http.Header, allowedIPs []string) bool {
	ip, err := getRealIP(headers)
	return err == nil && slices.Contains(allowedIPs, ip)
}
