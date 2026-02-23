package docker

import (
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Installer(pkg config.Package) error {
	pkgName := pkg.Name
	pkgConfig := pkg.Config
	fmt.Println(pkgName, pkgConfig)

	err := installDocker()
	if err != nil {
		return err
	}
	return nil
}
