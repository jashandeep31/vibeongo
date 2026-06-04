#!/bin/bash
set -e

echo "Welcome to Vibeongo Server"

export DEBIAN_FRONTEND=noninteractive

sudo apt  update -y
sudo apt upgrade -y

sudo apt install tmux
 
# Add Docker's official GPG key:
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update

sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker ubuntu


# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 24

# Verify the Node.js version:
node -v # Should print "v24.16.0".

# Verify npm version:
npm -v # Should print "11.13.0".


# opencode install
curl -fsSL https://opencode.ai/install | bash

# claude code install 
curl -fsSL https://claude.ai/install.sh | bash

# codex
curl -fsSL https://chatgpt.com/codex/install.sh | sh

# neovim install
sudo apt install neovim

# fzf install
sudo apt install fzf
 

rm -f ~/.ssh/authorized_keys
rm -f ~/.ssh/known_hosts


# I am using ./script.sh in root to run it 
# so just clearing the file
rm ./script.sh



