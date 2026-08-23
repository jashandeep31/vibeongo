package actions

import (
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/vibeongo/config"
)

func FormatConfigSummary(cfg config.Config) string {
	var b strings.Builder
	b.WriteString("API auth token: ")
	b.WriteString(cfg.InstanceConfig.SessionToken)

	for _, repo := range cfg.Repos {
		b.WriteString("\nreponame: ")
		b.WriteString(repo.FullName)
		b.WriteString(" token: ")
		b.WriteString(repo.AccessToken)
		b.WriteString("\nclone URL: ")
		b.WriteString(repo.HTTPURL)
		b.WriteString(" username: ")
		b.WriteString(repo.GitUsername)
	}

	return b.String()
}
