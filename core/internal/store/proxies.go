package store

import (
	"net/url"
	"sync"
	"time"
)

type Proxy struct {
	Host      string
	TargetUrl *url.URL
	ExpiresAt time.Time
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

func (pm *ProxyManager) AddProxy(hostUrl string, targetUrl string) error {
	t, err := url.Parse(targetUrl)
	if err != nil {
		return err
	}

	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.proxies[hostUrl] = &Proxy{
		Host:      hostUrl,
		TargetUrl: t,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	return nil
}

func (pm *ProxyManager) GetProxyByHost(host string) (*Proxy, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	p, ok := pm.proxies[host]
	return p, ok
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
