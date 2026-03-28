import { env } from "../lib/env.js";

export const setupInstanceScript = (): string => {
  return `#!/usr/bin/env bash
set -euxo pipefail

exec > /var/log/user-data.log 2>&1

USER_HOME="/home/ubuntu"
VIBEONGO_HOME="$USER_HOME/vibeongo"

echo "Step 1: Setup SSH"

mkdir -p "$USER_HOME/.ssh"

echo "${env.SSH_KEY}" >> "$USER_HOME/.ssh/authorized_keys"

chmod 700 "$USER_HOME/.ssh"
chmod 600 "$USER_HOME/.ssh/authorized_keys"

chown -R ubuntu:ubuntu "$USER_HOME/.ssh"

mkdir -p "$VIBEONGO_HOME"
sudo chown -R ubuntu:ubuntu $VIBEONGO_HOME

echo "Step 2: Downloading the bootstrap scripts adnd api server"

curl -fL https://l1.devsradar.com/install -o "$VIBEONGO_HOME/install"

curl -fL https://l1.devsradar.com/install-api -o "$VIBEONGO_HOME/server"

echo "Step 3: Download config"

curl -fL https://l1.devsradar.com/config -o "$VIBEONGO_HOME/config.json"

chmod +x "$VIBEONGO_HOME/install"
chmod +x "$VIBEONGO_HOME/server"

echo "Step 4: Run install script"

sudo -u ubuntu bash -c "cd $VIBEONGO_HOME && ./install"

echo "Step 5: Done"

source /home/ubuntu/.bashrc

echo "Step 6: Setup systemd service"

cat <<EOF > /etc/systemd/system/myserver.service
[Unit]
Description=My API Server
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/vibeongo
ExecStart=/home/ubuntu/vibeongo/server
Restart=always
RestartSec=5

Environment=TERM=xterm-256color
Environment=COLORTERM=truecolor
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reexec
systemctl daemon-reload
systemctl enable myserver
systemctl start myserver

`;
};
