package proxy

import (
	"net/http"
	"os"

	"github.com/jashandeep31/vibeongo/core/internal/proxy/routes"
	"github.com/jashandeep31/vibeongo/core/internal/proxy/store"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

var (
	AppVersion = "v1.0.0-default"
	BuildTime  = "unknown"
)

var allowedCORSOrigins = []string{
	"https://www.vibeongo.com",
	"https://vibeongo.com",
	"http://localhost:3000",
	"https://app.t3.codes",
}

type ProxyServer struct {
	store *store.ProxyManager
}

func NewProxyServer(store *store.ProxyManager) *ProxyServer {
	return &ProxyServer{store: store}
}

func (s *ProxyServer) Start(addr string) error {
	e := echo.New()
	e.Use(middleware.RequestLogger())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: allowedCORSOrigins,
		AllowMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		},
		// Keep AllowHeaders empty so Echo reflects the browser's
		// Access-Control-Request-Headers, including custom T3 headers.
	}))

	routes.Register(
		e,
		s.store,
		AppVersion,
		BuildTime,
		os.Getenv("PROXY_SERVER_TOKEN"),
	)

	return e.Start(addr)
}
