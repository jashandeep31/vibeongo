package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"

	"github.com/jashandeep31/vibeongo/core/internal/middlewares"
	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func ProxyServerStart() {
	proxyStore := store.NewProxyManager()
	proxyStore.AddProxy("d1.devsradar.com", "http://localhost:8000")

	// proxy handler
	proxy := &httputil.ReverseProxy{
		Director: func(r *http.Request) {
			proxyData, ok := proxyStore.GetProxyByHost(r.Host)
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

	mux := http.NewServeMux()
	mux.Handle(
		"GET /proxy/status/",
		middlewares.CheckProxyAuthMiddleware(http.HandlerFunc(
			func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				type proxyItem struct {
					Url     string `json:"url"`
					ProxyTo string `json:"proxyTo"`
				}

				mappedProxies := proxyStore.GetAllProxies()
				proxies := make([]proxyItem, 0, len(mappedProxies))
				for _, proxy := range mappedProxies {
					proxies = append(proxies, proxyItem{Url: proxy.Host, ProxyTo: proxy.TargetUrl.String()})
				}

				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(proxies)
			},
		)),
	)

	mux.Handle("POST /proxy/add", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
		proxyStore.AddProxy(data.Host, data.TargetUrl)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}))

	mux.HandleFunc("GET /proxy/login", func(w http.ResponseWriter, r *http.Request) {
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
	})

	mux.Handle("/", proxy)
	http.ListenAndServe(":5000", mux)
}
