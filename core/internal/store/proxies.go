package store

import (
	"net/url"
	"sync"
	"time"
)

type proxy struct {
	Host      string
	TargetUrl *url.URL
	ExpiresAt time.Time
}

type proxyManager struct {
	mu      sync.RWMutex
	proxies map[string]*proxy
}

func NewProxyManager() *proxyManager {
	pm := &proxyManager{
		proxies: make(map[string]*proxy),
	}
	go pm.cleanup()
	return pm
}

func (pm *proxyManager) AddProxy(hostUrl string, targetUrl string) error {
	t, err := url.Parse(targetUrl)
	if err != nil {
		return err
	}

	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.proxies[hostUrl] = &proxy{
		Host:      hostUrl,
		TargetUrl: t,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	return nil
}

func (pm *proxyManager) GetProxyByHost(host string) (*proxy, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	p, ok := pm.proxies[host]
	return p, ok
}

func (pm *proxyManager) cleanup() {
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
