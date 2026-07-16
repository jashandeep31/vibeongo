package server

import (
	"bufio"
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"os"
	"slices"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/store"
)

var (
	AppVersion = "v1.0.0-default"
	BuildTime  = "unknown"
)

var allowedCORSOrigins = map[string]struct{}{
	"https://www.vibeongo.com": {},
	"https://vibeongo.com":     {},
	"http://localhost:3000":    {},
}

type ProxyServer struct {
	store *store.ProxyManager
}

func NewProxyServer(store *store.ProxyManager) *ProxyServer {
	return &ProxyServer{store: store}
}

func (s *ProxyServer) Start(addr string) error {
	mux := http.NewServeMux()

	// routes
	mux.HandleFunc("GET /proxy/version", s.handleStatus)
	mux.HandleFunc("POST /proxy/invalidate", s.handleInvalidate)
	mux.HandleFunc("GET /proxy/my-ip", s.handleMyIP)

	// reverse proxy
	mux.Handle("/", s.reverseProxy())

	return http.ListenAndServe(addr, withCORS(mux))
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		_, isAllowedOrigin := allowedCORSOrigins[origin]

		if r.Method == http.MethodOptions {
			if isAllowedOrigin {
				setCORSHeaders(w.Header(), origin)
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(&corsResponseWriter{
			ResponseWriter: w,
			origin:         origin,
			allowed:        isAllowedOrigin,
		}, r)
	})
}

type corsResponseWriter struct {
	http.ResponseWriter
	origin  string
	allowed bool
	wrote   bool
}

func (w *corsResponseWriter) WriteHeader(statusCode int) {
	if !w.wrote {
		if w.allowed {
			setCORSHeaders(w.Header(), w.origin)
		}
		w.wrote = true
	}
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *corsResponseWriter) Write(data []byte) (int, error) {
	if !w.wrote {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(data)
}

func (w *corsResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hijacker, ok := w.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("response writer does not support hijacking")
	}
	return hijacker.Hijack()
}

func setCORSHeaders(headers http.Header, origin string) {
	headers.Del("Access-Control-Allow-Origin")
	headers.Set("Access-Control-Allow-Origin", origin)
	headers.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	headers.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
	headers.Add("Vary", "Origin")
}

// Return the version of the application along with the build time.
func (s *ProxyServer) handleStatus(w http.ResponseWriter, r *http.Request) {
	remoteAddr := r.RemoteAddr
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(struct {
		Version string
		Build   string
		IP      string
	}{Version: AppVersion, Build: BuildTime, IP: remoteAddr})
}

// Takes an array of hosts and invalidates them in one go.
func (s *ProxyServer) handleInvalidate(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Hosts []string `json:"hosts"`
	}

	if !hasValidBearerToken(r.Header.Get("Authorization"), os.Getenv("PROXY_SERVER_TOKEN")) {
		http.Error(w, "401", http.StatusUnauthorized)
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "400", http.StatusBadRequest)
		return
	}
	for _, host := range data.Hosts {
		s.store.InvalidateProxy(host)
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func hasValidBearerToken(authorizationHeader, expectedToken string) bool {
	if expectedToken == "" {
		return false
	}

	scheme, token, found := strings.Cut(authorizationHeader, " ")
	if !found || !strings.EqualFold(scheme, "Bearer") || token == "" || strings.Contains(token, " ") {
		return false
	}

	return subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) == 1
}

func (s *ProxyServer) handleMyIP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ip, err := getRealIP(r.Header)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(struct {
			Error string `json:"error"`
		}{
			Error: err.Error(),
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(struct {
		IP string `json:"ip"`
	}{
		IP: ip,
	})
}

func (s *ProxyServer) reverseProxy() http.Handler {
	proxy := &httputil.ReverseProxy{
		Director: func(r *http.Request) {
			proxyData := r.Context().Value(proxyDataContextKey{}).(*store.Proxy)
			r.URL.Scheme = proxyData.Target.Scheme
			r.Host = proxyData.Host
			r.URL.Host = proxyData.Target.Host
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			w.WriteHeader(http.StatusBadGateway)
			w.Write([]byte("502"))
		},
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		proxyData, ok := s.store.GetProxyByHost(r.Host)
		if !ok {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("404"))
			return
		}

		if !proxyData.AllowAllIPs && !checkIPIsAllowed(r.Header, proxyData.AllowedIPs) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)

			ip, err := getRealIP(r.Header)
			if err != nil {
				_ = json.NewEncoder(w).Encode(struct {
					Error string `json:"error"`
				}{
					Error: "IP is not found. Please report this if you are seeing it.",
				})
				return
			}

			_ = json.NewEncoder(w).Encode(struct {
				Error string `json:"error"`
			}{
				Error: "IP is not allowed. Please add it to allowed IPs. Your IP is " + ip,
			})
			return
		}

		ctx := context.WithValue(r.Context(), proxyDataContextKey{}, proxyData)
		proxy.ServeHTTP(w, r.WithContext(ctx))
	})
}

type proxyDataContextKey struct{}

func getRealIP(headers map[string][]string) (string, error) {
	var XRealIP string

	for k, v := range headers {
		if len(v) <= 0 {

			return "", fmt.Errorf("ip not found ")
		}
		if k == "X-Real-Ip" {
			XRealIP = v[0]
		}
	}
	return XRealIP, nil
}

func checkIPIsAllowed(headers map[string][]string, allowedIps []string) bool {
	IP, err := getRealIP(headers)
	if err != nil {
		return false
	}
	if IP == "" {
		return false
	}
	return slices.Contains(allowedIps, IP)
}
