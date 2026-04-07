package commands

import (
	"fmt"

	"github.com/spf13/cobra"
)

func VpsSetup() *cobra.Command {
	return &cobra.Command{
		Use:   "vpssetup",
		Short: "Install and setup ",
		Long:  "Install configure, setup the thins like auth for opencode and much installing basic tool and much more ",
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("Please setup the server")
			return nil
		},
	}
}
