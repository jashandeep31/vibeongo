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
  --url https://l1.devsradar.com/api/v1/runtime/sessions/${projectSessionId}/config \\
  --header "Authorization: Bearer ${authToken}" \\
  | jq '.data' > "\\$CONFIG_DIR/config.json"

curl -fsSL https://l1.devsradar.com/install | bash

vibeongo init-workspace
SCRIPT

chmod +x /tmp/ubuntu-setup.sh

# Run as ubuntu
sudo -u ubuntu /tmp/ubuntu-setup.sh

date
`;
};

// const temp = `
//
// echo "Step 2: Downloading the bootstrap scripts adnd api server"
//
// curl -fL https://l1.devsradar.com/install -o "$VIBEONGO_HOME/install"
//
// curl -fL https://l1.devsradar.com/install-api -o "$VIBEONGO_HOME/server"
//
// echo "Step 3: Download config"
//
// curl --request GET \
//   --url https://l1.devsradar.com/api/v1/runtime/sessions/${projectSessionId}/config \
//   --header 'Authorization: Bearer ${authToken}' \
//   | jq '.data' > "$VIBEONGO_HOME/config.json"
//
// chmod +x "$VIBEONGO_HOME/install"
// chmod +x "$VIBEONGO_HOME/server"
//
// echo "Step 4: Run install script"
//
// sudo -u ubuntu bash -c "cd $VIBEONGO_HOME && ./install setup"
// sudo chown -R ubuntu:ubuntu "$VIBEONGO_HOME"
// echo "Step 5: Done"
//
// source /home/ubuntu/.bashrc
//
// echo "Step 6: Setup systemd service"
//
// cat <<EOF > /etc/systemd/system/myserver.service
// [Unit]
// Description=My API Server
// After=network.target
//
// [Service]
// User=ubuntu
// WorkingDirectory=/home/ubuntu/vibeongo
// ExecStart=/home/ubuntu/vibeongo/server
// Restart=always
// RestartSec=5
//
// Environment=TERM=xterm-256color
// Environment=COLORTERM=truecolor
// Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/bin
//
// [Install]
// WantedBy=multi-user.target
// EOF
//
// systemctl daemon-reexec
// systemctl daemon-reload
// systemctl enable myserver
// systemctl start myserver
//
// cd $VIBEONGO_HOME
// date
// ./install repo_setup
// sudo -u ubuntu bash -c "cd $VIBEONGO_HOME && ./install task"
// `;
