package server

import (
	"net/http"
	"net/http/httputil"

	"github.com/jashandeep31/vibeongo/core/internal/store"
)

func ProxyServerStart() {
	proxyStore := store.NewProxyManager()
	proxyStore.AddProxy("d1.devsradar.com", "http://localhost:8000")

	// proxy handler
	proxy := &httputil.ReverseProxy{
		Director: func(r *http.Request) {
			proxyData, ok := proxyStore.GetProxyByHost(r.Host)
			if !ok {
				return
			}
			r.URL.Scheme = "http"
			r.Host = proxyData.Host
			r.URL.Host = proxyData.TargetUrl.Host
			// req.Header.Set("x-token", time.Now().UTC().Format(time.RFC1123))
		},
	}

	// basic http handler
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// status route
		if r.URL.Path == "/status" && r.Method == "GET" {
			w.Write([]byte("OK"))
			return
		}
		if r.URL.Path == "/add" && r.Method == "POST" {
			authToken := r.Header.Get("x-token")
			if authToken != "secret" {
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte("Unauthorized"))
				return
			}
			proxyStore.AddProxy(r.FormValue("host"), r.FormValue("target"))
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
			return
		}
		if r.URL.Path == "/login" && r.Method == "GET" {
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
			return
		}

		// setting up the proxy
		proxy.ServeHTTP(w, r)
	})

	http.ListenAndServe(":5000", handler)
}
