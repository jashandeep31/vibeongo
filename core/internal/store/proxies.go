package store

import (
	"fmt"
	"net/url"
	"sync"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/utils"
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

var apiClient = utils.APIClient{BaseURL: "https://l1.devsradar.com"}

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
	p, ok := pm.proxies[host]
	if !ok {
		proxy, err := getProxyFromServerCall(host)
		if err != nil {
			return nil, false
		}
		pm.AddProxy(host, proxy.TargetUrl.String(), proxy.AllowedIPs)
		return proxy, true
	}
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

func getProxyFromServerCall(host string) (*Proxy, error) {
	var parsedResponse Response
	if err := apiClient.Post(
		"/api/v1/internal/proxy/target-host/resolve",
		struct {
			Domain string `json:"domain"`
		}{Domain: host},
		&parsedResponse,
	); err != nil {
		return nil, err
	}

	allowedIPs := make([]string, 0, len(parsedResponse.Data.Routing.AllowedIPs))
	for _, ip := range parsedResponse.Data.Routing.AllowedIPs {
		allowedIPs = append(allowedIPs, ip.Ip)
	}

	targetUrl, err := url.Parse("http://" + parsedResponse.Data.Routing.Ip)
	if err != nil {
		return nil, fmt.Errorf("invalid target IP from server: %w", err)
	}

	return &Proxy{
		Host:       host,
		TargetUrl:  targetUrl,
		AllowedIPs: allowedIPs,
		ExpiresAt:  time.Now().Add(5 * time.Minute),
	}, nil
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
