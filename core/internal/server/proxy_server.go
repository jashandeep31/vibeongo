package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"

	"github.com/jashandeep31/vibeongo/core/internal/middlewares"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

type ProxyServer struct {
	store *store.ProxyManager
}

func NewProxyServer(store *store.ProxyManager) *ProxyServer {
	return &ProxyServer{store: store}
}

func (s *ProxyServer) Start(addr string) error {
	s.store.AddProxy("d1.devsradar.com", "http://localhost:8000")
	s.store.AddProxy("localhost:5000", "http://localhost:8000")

	mux := http.NewServeMux()

	mux.Handle("GET /proxy/status/", middlewares.CheckProxyAuthMiddleware(http.HandlerFunc(s.handleStatus)))
	mux.HandleFunc("POST /proxy/add", s.handleAdd)
	mux.HandleFunc("GET /proxy/login", s.handleLogin)
	mux.Handle("/", s.reverseProxy())

	return http.ListenAndServe(addr, mux)
}

func (s *ProxyServer) handleStatus(w http.ResponseWriter, r *http.Request) {
	ip := r.Header.Get("X-Real-IP")
	if ip != "" {
		w.Header().Set("X-Real-IP", "temp")
	}

	fmt.Println(r.Header)
	w.Header().Set("Content-Type", "application/json")
	type proxyItem struct {
		Url     string `json:"url"`
		ProxyTo string `json:"proxyTo"`
	}

	mappedProxies := s.store.GetAllProxies()
	proxies := make([]proxyItem, 0, len(mappedProxies))
	for _, proxy := range mappedProxies {
		proxies = append(proxies, proxyItem{Url: proxy.Host, ProxyTo: proxy.TargetUrl.String()})
	}

	json.NewEncoder(w).Encode(struct {
		Proxies []proxyItem `json:"proxies"`
		Host    string      `json:"host"`
		Version string      `json:"version"`
	}{
		Proxies: proxies,
		Host:    ip,
		Version: "1.0.0",
	})
}

func (s *ProxyServer) handleAdd(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Host      string `json:"host"`
		TargetUrl string `json:"target_url"`
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
	s.store.AddProxy(data.Host, data.TargetUrl)
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
			r.URL.Scheme = "http"
			r.Host = proxyData.Host
			r.URL.Host = proxyData.TargetUrl.Host
			// req.Header.Set("x-token", time.Now().UTC().Format(time.RFC1123))
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
