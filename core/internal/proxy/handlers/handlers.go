package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"slices"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/proxy/store"
	"github.com/labstack/echo/v5"
)

type Handler struct {
	store        *store.ProxyManager
	version      string
	buildTime    string
	reverseProxy *httputil.ReverseProxy
}

func NewHandler(proxyStore *store.ProxyManager, version, buildTime string) *Handler {
	h := &Handler{
		store:     proxyStore,
		version:   version,
		buildTime: buildTime,
	}
	h.reverseProxy = &httputil.ReverseProxy{
		Director: func(r *http.Request) {
			proxyData := r.Context().Value(proxyDataContextKey{}).(*store.Proxy)
			originalHost := r.Host
			r.URL.Scheme = proxyData.Target.Scheme
			r.URL.Host = proxyData.Target.Host
			r.Host = proxyData.Target.Host

			if strings.Contains(strings.ToLower(proxyData.Target.Hostname()), "daytona") {
				// Daytona uses this header to retain the public preview domain.
				// Replace any client-supplied value so it cannot be spoofed.
				r.Header.Set("X-Forwarded-Host", originalHost)
				// All Vibeongo Daytona previews are public, so no preview token is
				// required to suppress Daytona's browser warning page.
				r.Header.Set("X-Daytona-Skip-Preview-Warning", "true")
			}
		},
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, _ error) {
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

	if !proxyData.AllowAllIPs && !checkIPIsAllowed(request.Header, proxyData.AllowedIPs) {
		ip, err := getRealIP(request.Header)
		if err != nil {
			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "IP is not found. Please report this if you are seeing it.",
			})
		}
		return c.JSON(http.StatusForbidden, map[string]string{
			"error": "IP is not allowed. Please add it to allowed IPs. Your IP is " + ip,
		})
	}

	ctx := context.WithValue(request.Context(), proxyDataContextKey{}, proxyData)
	h.reverseProxy.ServeHTTP(c.Response(), request.WithContext(ctx))
	return nil
}

func normalizeHost(host string) string {
	if parsedHost, _, err := net.SplitHostPort(host); err == nil {
		return parsedHost
	}
	return host
}

type proxyDataContextKey struct{}

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
