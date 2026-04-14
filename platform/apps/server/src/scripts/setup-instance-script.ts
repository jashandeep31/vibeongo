import { env } from "../lib/env.js";

interface SetupInstanceScriptOptions {
  sshKey: string;
  authToken: string;
  projectSessionId: string;
}

//TODO: please fix the next ami with removing port 8000 and adding 8080
export const setupInstanceScript = ({
  sshKey,
  authToken,
  projectSessionId,
}: SetupInstanceScriptOptions): string => {
  return `#!/usr/bin/env bash
set -euxo pipefail
exec > /var/log/user-data.log 2>&1

date

(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \
	&& sudo mkdir -p -m 755 /etc/apt/keyrings \
	&& out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
	&& cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
	&& sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
	&& sudo mkdir -p -m 755 /etc/apt/sources.list.d \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
	&& sudo apt update \
	&& sudo apt install gh -y

USER_HOME="/home/ubuntu"

echo "Step 1: Setup SSH"

mkdir -p "$USER_HOME/.ssh"
echo "${sshKey}" >> "$USER_HOME/.ssh/authorized_keys"

chmod 700 "$USER_HOME/.ssh"
chmod 600 "$USER_HOME/.ssh/authorized_keys"
chown -R ubuntu:ubuntu "$USER_HOME/.ssh"

# Firewall (root)
ufw allow 8080
ufw deny 8000

# Create ubuntu user script
cat <<SCRIPT > /tmp/ubuntu-setup.sh
#!/usr/bin/env bash
set -euxo pipefail

CONFIG_DIR="\\$HOME/.config/vibeongo"
mkdir -p "\\$CONFIG_DIR"

curl --request GET \\
  --url  ${env.BACKEND_URL}/api/v1/runtime/sessions/${projectSessionId}/config \\
  --header "Authorization: Bearer ${authToken}" \\
  | jq '.data' > "\\$CONFIG_DIR/config.json"

curl -fsSL https://l1.devsradar.com/install | bash

vibeongo init-workspace
SCRIPT

chmod +x /tmp/ubuntu-setup.sh

# Run as ubuntu
sudo -u ubuntu /tmp/ubuntu-setup.sh

vibeongo init-workspace
vibeongo init-repos
vibeongo run-tasks  
date
`;
};
