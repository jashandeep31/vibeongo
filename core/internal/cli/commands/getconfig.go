package commands

import (
	"fmt"

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

	response := ""

	response += fmt.Sprintf("API auth token: %s", cfg.Token)
	for _, repo := range cfg.Repos {
		formatedString := fmt.Sprintf("\nreponame: %s  token: %s", repo.FullName, repo.AccessToken)
		response += formatedString
	}
	fmt.Println(response)
	return nil
}
