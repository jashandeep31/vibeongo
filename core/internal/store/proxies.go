package store

import (
	"net/url"
	"sync"
)

type proxy struct {
	Host      string
	TargetUrl *url.URL
}

type proxyManager struct {
	mu      sync.RWMutex
	proxies map[string]*proxy
}

func NewProxyManager() *proxyManager {
	return &proxyManager{
		proxies: make(map[string]*proxy),
	}
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
	}
	return nil
}

func (pm *proxyManager) GetProxyByHost(host string) (*proxy, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	p, ok := pm.proxies[host]
	return p, ok
}
