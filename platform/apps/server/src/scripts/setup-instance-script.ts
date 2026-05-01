import { env } from "../lib/env.js";

interface SetupInstanceScriptOptions {
  sshKey: string;
  authToken: string;
  projectSessionId: string;
  instanceId: string;
}

//TODO: please fix the next ami with removing port 8000 and adding 8080
export const setupInstanceScript = ({
  sshKey,
  authToken,
  projectSessionId,
  instanceId,
}: SetupInstanceScriptOptions): string => {
  return `#!/usr/bin/env bash
set -euxo pipefail
exec > /var/log/user-data.log 2>&1

date

USER_HOME="/home/ubuntu"

echo "Step 1: Setup SSH"

mkdir -p "$USER_HOME/.ssh"
echo "${sshKey}" >> "$USER_HOME/.ssh/authorized_keys"

chmod 700 "$USER_HOME/.ssh"
chmod 600 "$USER_HOME/.ssh/authorized_keys"
chown -R ubuntu:ubuntu "$USER_HOME/.ssh"

# Create ubuntu user script
cat <<SCRIPT > /tmp/ubuntu-setup.sh
#!/usr/bin/env bash
set -euxo pipefail

CONFIG_DIR="\\$HOME/.config/vibeongo"
mkdir -p "\\$CONFIG_DIR"

curl --request GET \\
  --url  ${env.NODE_ENV == "development" ? "https://l1.devsradar.com" : env.BACKEND_URL}/api/v1/runtime/sessions/${projectSessionId}/config/${instanceId} \\
  --header "Authorization: Bearer ${authToken}" \\
  | jq '.data' > "\\$CONFIG_DIR/config.json"

curl -fsSL https://l1.devsradar.com/install | bash

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
