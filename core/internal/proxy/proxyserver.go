package proxy

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/proxy/routes"
	"github.com/jashandeep31/vibeongo/core/internal/proxy/store"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

var _ = godotenv.Load()

var (
	AppVersion = "v1.0.0-default"
	BuildTime  = "unknown"
)

type ProxyServer struct {
	store *store.ProxyManager
}

func NewProxyServer(store *store.ProxyManager) *ProxyServer {
	return &ProxyServer{store: store}
}

func proxyCORSConfig() middleware.CORSConfig {
	return middleware.CORSConfig{
		AllowOrigins: allowedCORSOrigins(),
		AllowMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		},
		// Keep AllowHeaders empty so Echo reflects every header from the
		// browser's Access-Control-Request-Headers value.
	}
}

func allowedCORSOrigins() []string {
	configuredOrigins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
	origins := make([]string, 0, len(configuredOrigins))
	for _, origin := range configuredOrigins {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins = append(origins, origin)
		}
	}

	if len(origins) == 0 {
		log.Fatalf("no allowedCORSOrigins  found ")
	}
	return origins
}

func (s *ProxyServer) Start(addr string) error {
	e := echo.New()
	e.Use(middleware.RequestLogger())
	e.Use(middleware.CORSWithConfig(proxyCORSConfig()))

	routes.Register(
		e,
		s.store,
		AppVersion,
		BuildTime,
		os.Getenv("PROXY_SERVER_TOKEN"),
	)

	return e.Start(addr)
}
