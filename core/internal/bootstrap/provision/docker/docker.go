package docker

import (
	"fmt"
	"strings"

	"github.com/fatih/color"
	"github.com/jashandeep31/vibeongo/core/internal/config"
	"github.com/metal3d/go-slugify"
)

func Setup(cfg *config.DockerConfig) error {
	color.Green("Installing the docker")
	// fmt.Println()
	// fmt.Println(cfg.Containers)
	err := installDocker()
	if err != nil {
		return err
	}
	// for _, container := range cfg.Containers {
	// 	// if err := runContainer(container); err != nil {
	// 	// 	return err
	// 	// }
	// 	fmt.Println("Running the container", container.Name)
	// }
	//
	// Composing up the docker containers
	// if err := ComposeContainers(pkg); err != nil {

	// 	return err
	// }

	for _, container := range cfg.Containers {
		folderName := strings.ToLower(slugify.Marshal(container.Name))
		fmt.Println(folderName)
		// create the folder

	}
	return nil
}
