package main

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/store"
)

var store1 = store.NewProxyManager()

var _ = store1.AddProxy("d1.devsradar.com", "http://localhost:3000")

func main() {
	// Parse the target backend URL
	target, err := url.Parse("http://localhost:8000")
	if err != nil {
		log.Fatal(err)
	}
	target2, err := url.Parse("http://localhost:3000")
	if err != nil {
		log.Fatal(err)
	}

	// Create a reverse proxy instance pointing to the target
	// proxy := httputil.NewSingleHostReverseProxy(target)
	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			if req.Host == "d1.devsradar.com" {
				req.URL.Scheme = target2.Scheme
				req.URL.Host = target2.Host
				req.Host = target2.Host
			} else {

				req.URL.Scheme = target.Scheme
				req.URL.Host = target.Host
				req.Host = target.Host
			}

			// setting the custom header
			req.Header.Set("x-token", time.Now().UTC().Format(time.RFC1123))

			fmt.Println(req.Method)
		},
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/status" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
			return
		}
		proxy.ServeHTTP(w, r)
	})
	// Start the proxy server on port 3000
	log.Println("Starting proxy server on :5000")
	log.Fatal(http.ListenAndServe(":5000", handler))
}
