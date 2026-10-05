package server

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/routes"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/store"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

// Start keeps public runtime routes separate from the private token bridge.
func Start() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	if err := utils.EnsurePluginTokenFile(); err != nil {
		return err
	}
	if utils.GetOpencodePluginToken() == "" {
		return errors.New("OpenCode plugin token is unavailable")
	}

	privateListener, err := net.Listen("tcp", "127.0.0.1:3102")
	if err != nil {
		return fmt.Errorf("bind private OpenCode bridge on 127.0.0.1:3102: %w", err)
	}
	defer privateListener.Close()
	publicListener, err := net.Listen("tcp", ":3101")
	if err != nil {
		return fmt.Errorf("bind public runtime server: %w", err)
	}
	defer publicListener.Close()

	tools := store.NewTools()
	public := echo.New()
	public.Use(middleware.CORS("*"))
	public.Use(middleware.RequestLogger())
	routes.Register(public, tools, cfg.InstanceConfig.VibeongoLocalToken)
	private := echo.New()
	routes.RegisterOpencodeInternal(private)

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	publicServer := &http.Server{Handler: public, ReadHeaderTimeout: 10 * time.Second, BaseContext: func(net.Listener) context.Context { return ctx }}
	privateServer := &http.Server{Handler: private, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 5 * time.Second, WriteTimeout: 40 * time.Second, IdleTimeout: 30 * time.Second, BaseContext: func(net.Listener) context.Context { return ctx }}
	failures := make(chan error, 2)
	go func() { failures <- privateServer.Serve(privateListener) }()
	go func() { failures <- publicServer.Serve(publicListener) }()
	// Both listeners and the token file exist before OpenCode loads plugins.
	opencodeDone := make(chan struct{})
	go func() {
		defer close(opencodeDone)
		if err := tools.OpenCode.StartWebServerWithRetryContext(ctx); err != nil && ctx.Err() == nil {
			public.Logger.Error("failed to start opencode web server", "error", err)
		}
	}()

	select {
	case err = <-failures:
		if errors.Is(err, http.ErrServerClosed) {
			err = nil
		}
	case <-ctx.Done():
		err = nil
	}
	cancel()
	// Closing also cancels any outstanding bridge request through BaseContext.
	_ = privateServer.Close()
	_ = publicServer.Close()
	<-opencodeDone
	if stopErr := tools.OpenCode.StopWebServer(); stopErr != nil {
		public.Logger.Error("failed to stop opencode web server", "error", stopErr)
	}
	return err
}
