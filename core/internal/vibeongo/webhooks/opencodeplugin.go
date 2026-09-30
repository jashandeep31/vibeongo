package webhooks

import (
	"crypto/subtle"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/jashandeep31/vibeongo/core/internal/shared/httpclient"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/utils"
	"github.com/labstack/echo/v5"
)

type OpenCodeEventType string

const (
	OpencoodeEventSessionExecutionStarted     OpenCodeEventType = "session.execution.started"
	OpencoodeEventSessionExecutionSucceeded   OpenCodeEventType = "session.execution.succeeded"
	OpencoodeEventSessionExecutionFailed      OpenCodeEventType = "session.execution.failed"
	OpencoodeEventSessionExecutionInterrupted OpenCodeEventType = "session.execution.interrupted"

	OpencoodeEventFormCreated       OpenCodeEventType = "form.created"
	OpencoodeEventFormReplied       OpenCodeEventType = "form.replied"
	OpencoodeEventFormCancelled     OpenCodeEventType = "form.cancelled"
	OpencoodeEventPermissionAsked   OpenCodeEventType = "permission.asked"
	OpencoodeEventPermissionReplied OpenCodeEventType = "permission.replied"

	OpencoodeEventSessionViewed OpenCodeEventType = "session.viewed"
)

type Data struct {
	SessionID string `json:"sessionID"`
}

// Notification is written by the plugin's notification agent, absent when that failed
type Notification struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

type OpenCodeEvent struct {
	// unique per opencode event ("evt_..."), the same in every plugin copy that sees it
	ID           string            `json:"id"`
	Type         OpenCodeEventType `json:"type"`
	Data         Data              `json:"data"`
	Notification *Notification     `json:"notification,omitempty"`
}

// crafted title and body from the plugin, or the given defaults
func (e OpenCodeEvent) notificationText(title string, body string) (string, string) {
	if e.Notification == nil || strings.TrimSpace(e.Notification.Title) == "" {
		return title, body
	}
	return strings.TrimSpace(e.Notification.Title), strings.TrimSpace(e.Notification.Body)
}

// how long an event id is remembered; every plugin copy posts within seconds
const seenEventTTL = 10 * time.Minute

var (
	seenEventsMu sync.Mutex
	seenEvents   = map[string]time.Time{}
)

// firstSighting reports whether this event id was not handled yet. More than
// one opencode process can load the plugin (e.g. a local service and a TUI),
// and each posts the same event, which must become a single notification.
func firstSighting(eventID string) bool {
	if eventID == "" {
		return true
	}
	seenEventsMu.Lock()
	defer seenEventsMu.Unlock()

	now := time.Now()
	for id, seenAt := range seenEvents {
		if now.Sub(seenAt) > seenEventTTL {
			delete(seenEvents, id)
		}
	}
	if _, seen := seenEvents[eventID]; seen {
		return false
	}
	seenEvents[eventID] = now
	return true
}

func OpenCodeEventsWebhook(c *echo.Context) error {
	authtoken := c.Request().Header.Get("Authorization")
	expectedToken := utils.GetOpencodePluginToken()
	if expectedToken == "" || subtle.ConstantTimeCompare([]byte(authtoken), []byte(expectedToken)) != 1 {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid token")
	}

	var event OpenCodeEvent
	err := echo.BindBody(c, &event)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// a duplicate still gets 200: the plugin did nothing wrong
	if !firstSighting(event.ID) {
		return nil
	}

	switch event.Type {
	case OpencoodeEventSessionExecutionSucceeded:
		title, body := event.notificationText(
			"Task finished",
			"Your agent has finished working. Open the session to review the changes.",
		)
		go func() {
			if err := SendNotificationEvent(title, body, event.Data.SessionID); err != nil {
				fmt.Println("OpenCodeEventsWebhook: failed to send notification:", err)
			}
		}()

	case OpencoodeEventSessionExecutionFailed:
		fmt.Println("OpenCodeEventsWebhook: session.execution.failed")

	//TODO: support other will be implemented later
	default:
		fmt.Println("OpenCodeEventsWebhook: unknown event type or we not implemented it yet")
	}

	return nil
}

type notificationRequest struct {
	Title string `json:"title"`
	Body  string `json:"body,omitempty"`
	URL   string `json:"url,omitempty"`
}

// chatURL is the mobile app screen of the opencode chat, empty when unknown
// so the platform falls back to the session screen
func chatURL(cfg config.Config, opencodeSessionID string) string {
	if cfg.ProjectID == "" || opencodeSessionID == "" {
		return ""
	}
	return "/projects/" + url.PathEscape(cfg.ProjectID) +
		"/sessions/" + url.PathEscape(cfg.SessionID) +
		"/chat?chatId=" + url.QueryEscape(opencodeSessionID)
}

// API call to backend to send the notification to the owner of this instance
func SendNotificationEvent(title string, body string, opencodeSessionID string) error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	apiClient := httpclient.Client{BaseURL: cfg.ServerBaseURL}

	headers := map[string]string{
		"Authorization": "Bearer " + cfg.InstanceConfig.SessionToken,
		"X-Instance-Id": cfg.InstanceID,
	}

	path := "/api/v1/notifications/runtime/sessions/" + cfg.SessionID
	notification := notificationRequest{
		Title: title,
		Body:  body,
		URL:   chatURL(cfg, opencodeSessionID),
	}

	_, err = apiClient.Post(path, notification, headers, nil)
	return err
}
