package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const redeemPath = "/api/v1/internal/ssh-tickets/redeem"

type gatewayAPI struct {
	endpoint string
	token    string
	client   *http.Client
}

type terminalGrant struct {
	Valid        bool      `json:"valid"`
	WebsocketURL string    `json:"websocketUrl"`
	ProxyToken   string    `json:"proxyToken"`
	RuntimeToken string    `json:"runtimeToken"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

func newGatewayAPI() (*gatewayAPI, error) {
	base := strings.TrimSpace(os.Getenv("SSH_GATEWAY_API_URL"))
	token := strings.TrimSpace(os.Getenv("SSH_GATEWAY_TOKEN"))
	if base == "" || token == "" {
		return nil, errors.New("SSH_GATEWAY_API_URL and SSH_GATEWAY_TOKEN are required")
	}
	u, err := url.Parse(base)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		return nil, errors.New("SSH_GATEWAY_API_URL must be an origin without a path")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, errors.New("SSH_GATEWAY_API_URL must use HTTP or HTTPS")
	}
	u.Path = redeemPath
	return &gatewayAPI{
		endpoint: u.String(),
		token:    token,
		client: &http.Client{
			Timeout: 10 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}, nil
}

func (api *gatewayAPI) redeem(ticket string) (terminalGrant, error) {
	if len(ticket) != 43 || !validTicket(ticket) {
		return terminalGrant{}, errors.New("invalid SSH ticket format")
	}
	requestBody, _ := json.Marshal(struct {
		Ticket string `json:"ticket"`
	}{Ticket: ticket})
	request, err := http.NewRequest(http.MethodPost, api.endpoint, bytes.NewReader(requestBody))
	if err != nil {
		return terminalGrant{}, errors.New("create ticket redemption request")
	}
	request.Header.Set("Authorization", "Bearer "+api.token)
	request.Header.Set("Content-Type", "application/json")
	response, err := api.client.Do(request)
	if err != nil {
		return terminalGrant{}, errors.New("ticket redemption server unavailable")
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		if response.StatusCode == http.StatusUnauthorized {
			var failure struct {
				Message string `json:"message"`
			}
			if json.NewDecoder(io.LimitReader(response.Body, 1024)).Decode(&failure) == nil {
				switch failure.Message {
				case "Unauthorized":
					return terminalGrant{}, errors.New("gateway shared token was rejected by the platform server")
				case "Invalid or expired SSH ticket":
					return terminalGrant{}, errors.New("SSH ticket is expired or was already used")
				}
			}
		}
		return terminalGrant{}, fmt.Errorf("ticket redemption returned HTTP %d", response.StatusCode)
	}
	var grant terminalGrant
	if err := json.NewDecoder(io.LimitReader(response.Body, 64*1024)).Decode(&grant); err != nil {
		return terminalGrant{}, errors.New("invalid ticket redemption response")
	}
	if !grant.Valid || grant.WebsocketURL == "" || grant.ProxyToken == "" || grant.RuntimeToken == "" || !time.Now().Before(grant.ExpiresAt) {
		return terminalGrant{}, errors.New("incomplete or expired terminal grant")
	}
	return grant, nil
}

func validTicket(ticket string) bool {
	for _, character := range ticket {
		if !((character >= 'A' && character <= 'Z') || (character >= 'a' && character <= 'z') || (character >= '0' && character <= '9') || character == '-' || character == '_') {
			return false
		}
	}
	return true
}
