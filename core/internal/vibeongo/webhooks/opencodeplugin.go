package webhooks

import (
	"fmt"
	"net/http"

	"github.com/jashandeep31/vibeongo/core/internal/shared/httpclient"
	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
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

type OpenCodeEvent struct {
	Type OpenCodeEventType `json:"type"`
	Data Data              `json:"data"`
}

func OpenCodeEventsWebhook(c *echo.Context) error {
	var event OpenCodeEvent
	err := echo.BindBody(c, &event)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	switch event.Type {
	case OpencoodeEventSessionExecutionSucceeded:
		// SendNotificationEvent( /*  */ )
		// fmt.Println("OpenCodeEventsWebhook: session.execution.succeeded")

	case OpencoodeEventSessionExecutionFailed:
		fmt.Println("OpenCodeEventsWebhook: session.execution.failed")

	//TODO: support other will be implemented later
	default:
		fmt.Println("OpenCodeEventsWebhook: unknown event type or we not implemented it yet")
	}

	return nil
}

// API call to backend to send the notification to the user
func SendNotificationEvent(sessionID string, title string, message string) error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	apiClient := httpclient.Client{BaseURL: cfg.ServerBaseURL}

	headers := map[string]string{
		"Authorization": cfg.InstanceConfig.SessionToken,
	}

	_, err = apiClient.Post("/v1/notification/send", struct{}{}, headers, nil)
	if err != nil {
		return err
	}
	return nil
}
