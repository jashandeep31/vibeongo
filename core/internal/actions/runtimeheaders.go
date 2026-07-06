package actions

import "github.com/jashandeep31/vibeongo/core/internal/config"

func runtimeAuthHeaders(cfg config.Config) map[string]string {
	return map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + cfg.InstanceConfig.SessionToken,
		"X-Instance-Id": cfg.InstanceID,
	}
}
