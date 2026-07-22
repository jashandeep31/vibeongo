package store

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

type Proxy struct {
	ID          string    `json:"id"`
	Domain      string    `json:"domain"`
	AllowedIPs  []string  `json:"allowed_ips"`
	AllowAllIPs bool      `json:"allowed_all_ips"`
	ExpiresAt   time.Time `json:"expires_at"`

	// Target is required by the reverse proxy, but must not be exposed by
	// public proxy metadata endpoints.
	Target *url.URL `json:"-"`
}

type ProxyManager struct {
	mu      sync.RWMutex
	proxies map[string]*Proxy
}

func NewProxyManager() *ProxyManager {
	pm := &ProxyManager{
		proxies: make(map[string]*Proxy),
	}
	// running the cleanup in bg
	go pm.cleanup()
	return pm
}

// AddProxy adds a resolved proxy to the local cache.
func (pm *ProxyManager) AddProxy(domain string, target string, allowedIPs []string, allowAllIPs bool) error {
	t, err := parseTarget(target)
	if err != nil {
		return err
	}
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.proxies[domain] = &Proxy{
		Domain:      domain,
		Target:      t,
		AllowedIPs:  append([]string(nil), allowedIPs...),
		AllowAllIPs: allowAllIPs,
		ExpiresAt:   time.Now().Add(5 * time.Minute),
	}
	return nil
}

// Return the proxy from the array using the domain name
// if not present then as the ip
func (pm *ProxyManager) GetProxyByHost(host string) (*Proxy, bool) {
	pm.mu.RLock()
	p, ok := pm.proxies[host]
	pm.mu.RUnlock()
	if ok {
		return p, true
	}

	proxy, err := getProxyFromServerCall(host)
	if err != nil {
		return nil, false
	}
	pm.mu.Lock()
	defer pm.mu.Unlock()
	if p, ok := pm.proxies[host]; ok {
		return p, true
	}
	pm.proxies[host] = proxy
	return proxy, true
}

type Response struct {
	Data struct {
		ID          string   `json:"id"`
		Domain      string   `json:"domain"`
		AllowAllIPs bool     `json:"allowed_all_ips"`
		Target      string   `json:"target"`
		AllowedIPs  []string `json:"allowed_ips"`
	} `json:"data"`
}

// Getting the proxy details from the server if not present locally
func getProxyFromServerCall(host string) (*Proxy, error) {
	apiClient := utils.APIClient{BaseURL: os.Getenv("PROXY_SERVER_URL")}
	var parsedResponse Response

	resp, err := apiClient.Post(
		"/api/v1/internal/proxy/target-host/resolve",
		struct {
			Domain string `json:"domain"`
		}{Domain: host},
		map[string]string{"Content-Type": "application/json", "Authorization": os.Getenv("PROXY_SERVER_TOKEN")},
		&parsedResponse,
	)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	if resp == nil {
		return nil, fmt.Errorf("nil response from server")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	if parsedResponse.Data.Domain == "" {
		return nil, fmt.Errorf("invalid response: missing domain")
	}

	target, err := parseTarget(parsedResponse.Data.Target)
	if err != nil {
		return nil, err
	}

	allowedIPs := make([]string, 0, len(parsedResponse.Data.AllowedIPs))
	for _, ip := range parsedResponse.Data.AllowedIPs {
		if ip != "" {
			allowedIPs = append(allowedIPs, ip)
		}
	}

	return &Proxy{
		ID:          parsedResponse.Data.ID,
		Domain:      parsedResponse.Data.Domain,
		Target:      target,
		AllowedIPs:  allowedIPs,
		AllowAllIPs: parsedResponse.Data.AllowAllIPs,
		ExpiresAt:   time.Now().Add(5 * time.Minute),
	}, nil
}

func parseTarget(raw string) (*url.URL, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, fmt.Errorf("invalid response: missing target")
	}

	target, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid target: %w", err)
	}
	if (target.Scheme != "http" && target.Scheme != "https") || target.Host == "" {
		return nil, fmt.Errorf("invalid target: expected an absolute HTTP URL")
	}
	return target, nil
}

func (pm *ProxyManager) InvalidateProxy(host string) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	delete(pm.proxies, host)
}

// Cleanup the expired proxies
func (pm *ProxyManager) cleanup() {
	ticker := time.NewTicker(30 * time.Second)
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

// Return all the proxies
func (pm *ProxyManager) GetAllProxies() map[string]*Proxy {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	proxies := make(map[string]*Proxy, len(pm.proxies))
	for host, proxy := range pm.proxies {
		copy := *proxy
		copy.AllowedIPs = append([]string(nil), proxy.AllowedIPs...)
		proxies[host] = &copy
	}
	return proxies
}
