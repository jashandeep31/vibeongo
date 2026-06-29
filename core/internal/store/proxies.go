package store

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/utils"
)

type Proxy struct {
	// The domain the that i am proxing to ex: test.vibeongo.one -> 192.168.1.1
	Host string
	// Target is the upstream destination URL, ex: http://192.168.1.1:8080
	Target     *url.URL
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
	// running the cleanup in bg
	go pm.cleanup()
	return pm
}

// Add the proxy to the proxies map
func (pm *ProxyManager) AddProxy(hostUrl string, target string, port int, allowedIPs []string) error {
	t, err := url.Parse("http://" + target + ":" + fmt.Sprint(port))
	if err != nil {
		return err
	}
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.proxies[hostUrl] = &Proxy{
		Host:       hostUrl,
		Target:     t,
		AllowedIPs: allowedIPs,
		ExpiresAt:  time.Now().Add(5 * time.Minute),
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
	fmt.Println("proxy", proxy)

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
		ID      string `json:"id"`
		Port    int    `json:"target_port"`
		Routing struct {
			Ip         string `json:"ip"`
			AllowedIPs []struct {
				Ip string `json:"ip"`
			} `json:"allowed_ips"`
		} `json:"routing"`
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

	if parsedResponse.Data.Routing.Ip == "" {
		return nil, fmt.Errorf("invalid response: missing routing IP")
	}

	fmt.Println(parsedResponse.Data)
	if parsedResponse.Data.Port == 0 {
		return nil, fmt.Errorf("invalid response: missing port")
	}

	allowedIPs := make([]string, 0, len(parsedResponse.Data.Routing.AllowedIPs))
	for _, ip := range parsedResponse.Data.Routing.AllowedIPs {
		if ip.Ip != "" {
			allowedIPs = append(allowedIPs, ip.Ip)
		}
	}

	fmt.Println(parsedResponse.Data.Routing.Ip, parsedResponse.Data.Port)
	fullTargetUrl, err := url.Parse("http://" + parsedResponse.Data.Routing.Ip + ":" + fmt.Sprint(parsedResponse.Data.Port))

	fmt.Println("proxy", "fas", fullTargetUrl)
	if err != nil {
		return nil, err
	}
	return &Proxy{
		Host:       host,
		Target:     fullTargetUrl,
		AllowedIPs: allowedIPs,
		ExpiresAt:  time.Now().Add(5 * time.Minute),
	}, nil
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
	return pm.proxies
}
