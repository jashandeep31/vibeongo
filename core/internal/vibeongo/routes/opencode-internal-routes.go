package routes

import (
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/handlers"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/middlewares"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/webhooks"
	"github.com/labstack/echo/v5"
)

// RegisterOpencodeInternal must only be used on the loopback listener.
func RegisterOpencodeInternal(e *echo.Echo) {
	e.POST("/webhook/opencode", webhooks.OpenCodeEventsWebhook, middlewares.CheckOpencodePluginAuth)
	e.POST("/internal/opencode/provider-credentials/codex/access-token", handlers.OpencodeAccessTokenHandler, middlewares.CheckOpencodePluginAuth)
}
