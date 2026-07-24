import { env } from "../lib/env.js";

interface SetupInstanceScriptOptions {
  sshKey: string;
  authToken: string;
  projectSessionId: string;
  instanceId: string;
  terminate?: boolean;
  username?: string;
}

export const setupInstanceScript = ({
  sshKey,
  authToken,
  projectSessionId,
  instanceId,
  terminate = false,
  username = "ubuntu",
}: SetupInstanceScriptOptions): string => {
  return `#!/usr/bin/env bash
set -euxo pipefail
mkdir -p /home/ubuntu/.logs
exec > /home/ubuntu/.logs/user-data.log 2>&1

date

USER_HOME="/home/${username}"

echo "Step 1: Setup SSH"

mkdir -p "$USER_HOME/.ssh"
echo "${sshKey}" >> "$USER_HOME/.ssh/authorized_keys"

chmod 700 "$USER_HOME/.ssh"
chmod 600 "$USER_HOME/.ssh/authorized_keys"
chown -R ${username}:${username} "$USER_HOME/.ssh"

# Create ${username} user script
cat <<SCRIPT > /tmp/${username}-setup.sh
#!/usr/bin/env bash
set -euxo pipefail

CONFIG_DIR="\\$HOME/.config/vibeongo"
mkdir -p "\\$CONFIG_DIR"

CONFIG_TMP="\\$(mktemp)"
for attempt in {1..30}; do
  if curl -fsS --request GET \\
    --url  ${env.SERVER_URL}/api/v1/runtime/sessions/${projectSessionId}/config/${instanceId} \\
    --header "Authorization: Bearer ${authToken}" \\
    --header "X-Instance-Id: ${instanceId}" \\
    | jq -e '.data' > "\\$CONFIG_TMP"; then
    mv "\\$CONFIG_TMP" "\\$CONFIG_DIR/config.json"
    break
  fi

  if [ "\\$attempt" -eq 30 ]; then
    echo "Failed to fetch runtime config after \\$attempt attempts" >&2
    rm -f "\\$CONFIG_TMP"
    exit 1
  fi

  sleep 2
done

#Now vibeongo is pre cooked in the ami
curl -fsSL ${env.SERVER_URL}/install | bash

SCRIPT

chmod +x /tmp/${username}-setup.sh

# Run as ${username}
sudo -u ${username} /tmp/${username}-setup.sh

sudo -iu ${username} bash <<'VIBEONGO_COMMANDS'
set -euo pipefail

vibeongo provisiontools
vibeongo initial-script
vibeongo setup-github-repos
vibeongo run-repos-setup-script
vibeongo final-script
vibeongo dev-script
echo "doing with the tasks"
vibeongo tasks  
VIBEONGO_COMMANDS

date
echo ---done---
`;
};
// ${terminate ? "vibeongo terminate" : ""}
