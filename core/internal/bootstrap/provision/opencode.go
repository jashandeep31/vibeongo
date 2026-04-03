package provision

import (
	"fmt"

	"github.com/fatih/color"
	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func SetupOpenCode(cfg *config.OpenCodeConfig) {
	color.Green("Setting up the opencode")
	// what we have to do is run the bash command
	// we have to copy hte auth.json file
	out, err := utils.RunCommand("bash", "-c", "curl -fsSL https://opencode.ai/install | bash")
	if err != nil {
		fmt.Println(err)
	}

	// path := "/home/jashan/.local/share/opencode"

	fmt.Println(out)
}
