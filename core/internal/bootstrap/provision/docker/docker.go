package docker

import (
	"bytes"
	"fmt"
	"os/exec"

	"github.com/jashandeep31/vibeongo/core/internal/config"
)

func Installer(pkg config.Package) {
	fmt.Println("We are installing the docker")

	// running the commands to the terminal

	cmd := exec.Command("docker", "-v")

	var out bytes.Buffer
	var stderr bytes.Buffer

	cmd.Stdout = &out
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		fmt.Println("err", err)
	}
	fmt.Println(out.String())
}
