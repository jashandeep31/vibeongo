package docker

import (
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Installer(pkg config.Package, sysmtemUser config.SystemUser) error {
	pkgName := pkg.Name
	pkgConfig := pkg.Config
	fmt.Println(pkgName, pkgConfig)

	// err := installDocker(sysmtemUser)
	// if err != nil {
	// 	return err
	// }

	// run the config docker container
	return nil
}

func ScriptValidator(pkg config.Package) {
	pkgConfig := pkg.Config
	configValidator(pkgConfig)
}
