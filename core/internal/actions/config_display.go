package actions

import (
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func FormatConfigSummary(cfg config.Config) string {
	var b strings.Builder
	b.WriteString("API auth token: ")
	b.WriteString(cfg.SessionToken)

	for _, repo := range cfg.Repos {
		b.WriteString("\nreponame: ")
		b.WriteString(repo.FullName)
		b.WriteString(" token: ")
		b.WriteString(repo.AccessToken)
		b.WriteString("\nthis x-access-token is valid for 1 hour so use like: git clone https://x-access-token:YOUR_TOKEN@github.com/owner/repo.git")
	}

	return b.String()
}
