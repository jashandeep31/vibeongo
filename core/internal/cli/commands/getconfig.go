package commands

import (
	"fmt"
	"strings"

	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/spf13/cobra"
)

func GetconfigCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get-config",
		Short: "Give token and other config related to workspace",
		Long:  "",
		RunE: func(cmd *cobra.Command, args []string) error {
			return getconfig()
		},
	}
}

func getconfig() error {
	cfg, err := config.LoadAndValidate("config.json")
	if err != nil {
		return err
	}

	var b strings.Builder
	b.WriteString("API auth token: ")
	b.WriteString(cfg.Token)

	for _, repo := range cfg.Repos {
		b.WriteString("\nreponame: ")
		b.WriteString(repo.FullName)
		b.WriteString(" token: ")
		b.WriteString(repo.AccessToken)
	}

	fmt.Println(b.String())
	return nil
}
