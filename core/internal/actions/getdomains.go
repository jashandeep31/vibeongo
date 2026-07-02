package actions

import "github.com/jashandeep31/vibeongo/core/internal/config"

func GetDomains() error {
	cfg, err := config.LoadAndValidate()
	if err != nil {
		return err
	}
	_ = cfg.ProjectID
	return nil

}
