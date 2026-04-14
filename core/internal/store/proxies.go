package store

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"
)

type Proxy struct {
	Host       string
	TargetUrl  *url.URL
	AllowedIPs []string
	ExpiresAt  time.Time
}

type ProxyManager struct {
	mu      sync.RWMutex
	proxies map[string]*Proxy
}

func NewProxyManager() *ProxyManager {
	pm := &ProxyManager{
		proxies: make(map[string]*Proxy),
	}
	go pm.cleanup()
	return pm
}

func (pm *ProxyManager) AddProxy(hostUrl string, targetUrl string, allowedIPs []string) error {
	t, err := url.Parse(targetUrl)
	if err != nil {
		return err
	}

	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.proxies[hostUrl] = &Proxy{
		Host:       hostUrl,
		TargetUrl:  t,
		AllowedIPs: allowedIPs,
		ExpiresAt:  time.Now().Add(5 * time.Minute),
	}
	return nil
}

func (pm *ProxyManager) GetProxyByHost(host string) (*Proxy, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	getProxyFromServerCall(host)
	p, ok := pm.proxies[host]
	return p, ok
}

type Response struct {
	Data struct {
		ID      string `json:"id"`
		Routing struct {
			Ip         string `json:"ip"`
			AllowedIPs []struct {
				Ip string `json:"ip"`
			} `json:"allowed_ips"`
		} `json:"routing"`
	} `json:"data"`
}

func getProxyFromServerCall(host string) {
	jsonData, _ := json.Marshal(map[string]string{
		"domain": "onwtwcx7ip.vibeongo.one",
	})
	response, err := http.Post(
		"http://localhost:8000/api/v1/internal/proxy/target-host/resolve",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		fmt.Println("failed to make api request")
	}
	responseData, err := io.ReadAll(response.Body)
	if err != nil {
		log.Fatal(err)
	}
	var parsedResponse Response
	if err := json.Unmarshal(responseData, &parsedResponse); err != nil {
		fmt.Println("failed to parse json")
	}
	if b, err := json.Marshal(parsedResponse.Data); err == nil {
		fmt.Println(string(b))
	}
}

func (pm *ProxyManager) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		pm.mu.Lock()
		for host, p := range pm.proxies {
			if now.After(p.ExpiresAt) {
				delete(pm.proxies, host)
			}
		}
		pm.mu.Unlock()
	}
}

func (pm *ProxyManager) GetAllProxies() map[string]*Proxy {
	return pm.proxies
}
