package docker

import (
	"fmt"

	"github.com/jashandeep31/vibeongo/core/internal/bootstrap/utils"
)

func installDocker() error {
	fmt.Println("Docker is getting installed")

	// Remove old docker packages
	fmt.Println("Removing old Docker packages...")
	_, err := utils.RunCommand("bash", "-c",
		"sudo apt remove -y $(dpkg --get-selections | grep -E 'docker.io|docker-compose|docker-compose-v2|docker-doc|podman-docker|containerd|runc' | cut -f1) 2>/dev/null || true",
	)
	if err != nil {
		return fmt.Errorf("failed to remove old packages: %w", err)
	}

	// Install dependencies
	fmt.Println("Installing dependencies...")
	_, err = utils.RunCommand("sudo", "apt", "install", "-y", "ca-certificates", "curl")
	if err != nil {
		return fmt.Errorf("failed to install dependencies: %w", err)
	}

	// Create keyrings directory
	_, err = utils.RunCommand("sudo", "install", "-m", "0755", "-d", "/etc/apt/keyrings")
	if err != nil {
		return fmt.Errorf("failed to create keyrings dir: %w", err)
	}

	// Download Docker GPG key
	_, err = utils.RunCommand("sudo", "bash", "-c",
		"curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc",
	)
	if err != nil {
		return fmt.Errorf("failed to download Docker GPG key: %w", err)
	}

	// Set permissions
	_, err = utils.RunCommand("sudo", "chmod", "a+r", "/etc/apt/keyrings/docker.asc")
	if err != nil {
		return fmt.Errorf("failed to chmod docker.asc: %w", err)
	}

	// Add Docker repo
	_, err = utils.RunCommand("sudo", "bash", "-c", `
. /etc/os-release
CODENAME="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $CODENAME
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
`)
	if err != nil {
		return fmt.Errorf("failed to add Docker repo: %w", err)
	}

	// Update apt
	_, err = utils.RunCommand("sudo", "apt", "update")
	if err != nil {
		return fmt.Errorf("failed to apt update: %w", err)
	}

	// Install Docker
	_, err = utils.RunCommand("sudo", "apt", "install", "-y",
		"docker-ce",
		"docker-ce-cli",
		"containerd.io",
		"docker-buildx-plugin",
		"docker-compose-plugin",
	)
	if err != nil {
		return fmt.Errorf("failed to install docker: %w", err)
	}

	fmt.Println("Docker installed successfully ✅")

	// Add user to docker group
	fmt.Println("Adding the docker to the user group")
	// _, err = utils.RunCommand("sudo", "usermod", "-aG", "docker", systemUser.Username)
	// if err != nil {
	// 	return fmt.Errorf("failed to update user group: %w", err)
	// }

	return nil
}
