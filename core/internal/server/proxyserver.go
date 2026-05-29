package server

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"slices"

	"github.com/jashandeep31/vibeongo/core/internal/store"
)

var (
	AppVersion = "v1.0.0-default"
	BuildTime  = "unknown"
)

var allowedCORSOrigins = map[string]struct{}{
	"https://vibeongo.com":     {},
	"https://l2.devsradar.com": {},
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
}

// Return the version of the applcation along with the build time
func (s *ProxyServer) handleStatus(w http.ResponseWriter, r *http.Request) {
	remoteAddr := r.RemoteAddr
	headers := r.Header
	json.NewEncoder(w).Encode(struct {
		Version string
		Build   string
		Ip      string
		Header  map[string][]string
	}{Version: AppVersion, Build: BuildTime, Ip: remoteAddr, Header: headers})
}

// Takes the array of of hosts and invalidate all those in  the on go
func (s *ProxyServer) handleInvalidate(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Hosts []string `json:"hosts"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400"))
		return
	}
	for _, host := range data.Hosts {
		s.store.InvalidateProxy(host)
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (s *ProxyServer) handleMyIP(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(struct {
		IP string `json:"ip"`
	}{
		IP: getRealIp(r.Header),
	})
}

func (s *ProxyServer) reverseProxy() http.Handler {
	return &httputil.ReverseProxy{
		Director: func(r *http.Request) {
			proxyData, ok := s.store.GetProxyByHost(r.Host)
			if !ok {
				r.Header.Set("proxy-error", "404")
				return
			}
			allowed := checkIpIsAllowed(r.Header, proxyData.AllowedIPs)
			if !allowed {
				r.Header.Set("proxy-error", "403")
				return
			}
			r.URL.Scheme = proxyData.Target.Scheme
			r.Host = proxyData.Host
			r.URL.Host = proxyData.Target.Host
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			errorHeader := r.Header.Get("proxy-error")
			switch errorHeader {
			case "404":
				w.WriteHeader(http.StatusNotFound)
				w.Write([]byte("404"))
			case "403":
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(struct {
					Error string
				}{
					Error: "Ip is not allowed please add to allowed ips, You Ip is " + getRealIp(r.Header),
				})
			default:
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte("500"))
			}
		},
	}
}

func getRealIp(headers map[string][]string) string {
	var XRealIp string
	for k, v := range headers {
		if k == "X-Real-Ip" {
			XRealIp = v[0]
		}
	}
	return XRealIp
}

func checkIpIsAllowed(headers map[string][]string, allowedIps []string) bool {
	Ip := getRealIp(headers)
	if Ip == "" {
		return false
	}
	return slices.Contains(allowedIps, Ip)
}
