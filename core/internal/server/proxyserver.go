package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"

	"github.com/jashandeep31/vibeongo/core/internal/store"
)

var (
	AppVersion = "v1.0.0-default"
	BuildTime  = "unknown"
)

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
	// just for dev purposes
	mux.HandleFunc("GET /proxy/list", s.listAll)
	mux.HandleFunc("GET /proxy/login", s.handleLogin)
	mux.HandleFunc("POST /proxy/add", s.handleAdd)
	mux.Handle("/", s.reverseProxy())

	return http.ListenAndServe(addr, mux)
}

func (s *ProxyServer) listAll(w http.ResponseWriter, r *http.Request) {
	s.store.GetProxyByHost("fdi0jh1n2u.vibeongo.one")
	json.NewEncoder(w).Encode(s.store.GetAllProxies())
}

// Return the version of the applcation along with the build time
func (s *ProxyServer) handleStatus(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(struct {
		Version string
		Build   string
	}{Version: AppVersion, Build: BuildTime})
}

func (s *ProxyServer) handleInvalidate(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Host string `json:"host"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400"))
		return
	}
	s.store.InvalidateProxy(data.Host)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (s *ProxyServer) handleAdd(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Host       string   `json:"host"`
		TargetUrl  string   `json:"targetUrl"`
		Port       int      `json:"port"`
		AllowedIPs []string `json:"allowedIPs"`
	}
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("url and host are required"))
		return
	}
	if (data.Host == "") || (data.TargetUrl == "") {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("400"))
		return
	}
	s.store.AddProxy(data.Host, data.TargetUrl, data.Port, data.AllowedIPs)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (s *ProxyServer) handleLogin(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "secret",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   3600,
	})
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Login success"))
}

func (s *ProxyServer) reverseProxy() http.Handler {
	return &httputil.ReverseProxy{
		Director: func(r *http.Request) {
			proxyData, ok := s.store.GetProxyByHost(r.Host)
			fmt.Println("proxyData", proxyData)
			if !ok {
				r.Header.Set("proxy-error", "404")
				return
			}
			r.URL.Scheme = proxyData.Target.Scheme
			r.Host = proxyData.Host
			r.URL.Host = proxyData.Target.Host
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			errorHeader := r.Header.Get("proxy-error")
			if errorHeader == "404" {
				w.WriteHeader(http.StatusNotFound)
				w.Write([]byte("404"))
			} else {
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte("500"))
			}
		},
	}
}
