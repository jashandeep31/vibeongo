package opencode

import (
	"encoding/json"
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
	"github.com/jashandeep31/vibeongo/core/internal/config"
)

type openCodeConfig struct {
	Command string `json:"command"`
}

func SetupOpenCode(pkg config.Package) error {
	var cfg openCodeConfig
	if err := json.Unmarshal(pkg.Config, &cfg); err != nil {
		return err
	}
	output, err := utils.RunCommand("bash", "-c", cfg.Command)
	if err != nil {
		return err
	}
	fmt.Println("output", output)
	return nil
}
