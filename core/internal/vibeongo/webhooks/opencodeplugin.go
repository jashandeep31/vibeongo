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
	// main opencode chat the event belongs to; for a subagent it is the chat
	// that started it. Data.SessionID is used when absent
	ChatSessionID string `json:"chatSessionID,omitempty"`
	// opencode chat title, absent while the chat has none
	ChatTitle string `json:"chatTitle,omitempty"`
	// what happened: the error message, the question, the permission asked for
	Detail string `json:"detail,omitempty"`
}

func (e OpenCodeEvent) chatSessionID() string {
	if e.ChatSessionID != "" {
		return e.ChatSessionID
	}
	return e.Data.SessionID
}

// body naming the chat when it has a title, so the user knows which one it is
func (e OpenCodeEvent) bodyWithChat(text string) string {
	if chatTitle := strings.TrimSpace(e.ChatTitle); chatTitle != "" {
		return chatTitle + ": " + text
	}
	return text
}

// detail from the plugin, or the fallback when it sent none
func (e OpenCodeEvent) detailOr(fallback string) string {
	if detail := strings.TrimSpace(e.Detail); detail != "" {
		return detail
	}
	return fallback
}

// crafted title and body from the plugin; otherwise the defaults, titled
// with the chat's name when it has one so the user knows which chat it is
func (e OpenCodeEvent) notificationText(title string, body string) (string, string) {
	if e.Notification != nil && strings.TrimSpace(e.Notification.Title) != "" {
		return strings.TrimSpace(e.Notification.Title), strings.TrimSpace(e.Notification.Body)
	}
	if chatTitle := strings.TrimSpace(e.ChatTitle); chatTitle != "" {
		return chatTitle, body
	}
	return title, body
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

	// kind is stored as the notification type, so clients can tell them apart
	var kind, title, body string
	switch event.Type {
	case OpencoodeEventSessionExecutionSucceeded:
		kind = "chat_finished"
		title, body = event.notificationText(
			"Task finished",
			"Your agent has finished working. Open the chat to review the changes.",
		)

	case OpencoodeEventSessionExecutionFailed:
		kind = "chat_failed"
		title = "Agent run failed"
		body = event.bodyWithChat(event.detailOr("The agent stopped with an error. Open the chat to see what went wrong."))

	case OpencoodeEventSessionExecutionInterrupted:
		// the plugin only forwards runs that did not stop on purpose
		kind = "chat_stopped"
		title = "Agent run stopped"
		body = event.bodyWithChat("The agent stopped before finishing. Open the chat to continue.")

	case OpencoodeEventFormCreated:
		kind = "chat_question"
		title = "Your agent has a question"
		body = event.bodyWithChat(event.detailOr("Open the chat to answer it."))

	case OpencoodeEventPermissionAsked:
		kind = "chat_permission"
		title = "Your agent needs permission"
		body = event.bodyWithChat(event.detailOr("Open the chat to allow or deny it."))

	default:
		fmt.Println("OpenCodeEventsWebhook: no notification for event type", event.Type)
		return nil
	}

	go func() {
		if err := SendNotificationEvent(kind, title, body, event.chatSessionID()); err != nil {
			fmt.Println("OpenCodeEventsWebhook: failed to send notification:", err)
		}
	}()

	return nil
}

type notificationRequest struct {
	Type  string `json:"type,omitempty"`
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
func SendNotificationEvent(kind string, title string, body string, opencodeSessionID string) error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	// terminate-after-done sandboxes run unattended and shut down when the
	// work is done, so their owner does not need to be notified
	if cfg.InstanceConfig.Terminate {
		return nil
	}
	apiClient := httpclient.Client{BaseURL: cfg.ServerBaseURL}

	headers := map[string]string{
		"Authorization": "Bearer " + cfg.InstanceConfig.SessionToken,
		"X-Instance-Id": cfg.InstanceID,
	}

	path := "/api/v1/notifications/runtime/sessions/" + cfg.SessionID
	notification := notificationRequest{
		Type:  kind,
		Title: title,
		Body:  body,
		URL:   chatURL(cfg, opencodeSessionID),
	}

	_, err = apiClient.Post(path, notification, headers, nil)
	return err
}
