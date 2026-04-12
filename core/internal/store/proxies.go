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
	Mu      sync.RWMutex
	Proxies map[string]*Proxy
}

func NewProxyManager() *ProxyManager {
	pm := &ProxyManager{
		Proxies: make(map[string]*Proxy),
	}
	go pm.cleanup()
	return pm
}

func (pm *ProxyManager) AddProxy(hostUrl string, targetUrl string) error {
	t, err := url.Parse(targetUrl)
	if err != nil {
		return err
	}

	pm.Mu.Lock()
	defer pm.Mu.Unlock()

	pm.Proxies[hostUrl] = &Proxy{
		Host:      hostUrl,
		TargetUrl: t,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	return nil
}

func (pm *ProxyManager) GetProxyByHost(host string) (*Proxy, bool) {
	pm.Mu.RLock()
	defer pm.Mu.RUnlock()

	p, ok := pm.Proxies[host]
	return p, ok
}

func (pm *ProxyManager) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		pm.Mu.Lock()
		for host, p := range pm.Proxies {
			if now.After(p.ExpiresAt) {
				delete(pm.Proxies, host)
			}
		}
		pm.Mu.Unlock()
	}
}
