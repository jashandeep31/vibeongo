interface SetupInstanceScriptOptions {
  sshKey: string;
  authToken: string;
}

export const setupInstanceScript = ({
  sshKey,
  authToken,
}: SetupInstanceScriptOptions): string => {
  return `#!/usr/bin/env bash
set -euxo pipefail
exec > /var/log/user-data.log 2>&1

# Create the swap file
sudo fallocate -l 3G /swapfile

# Set permissions
sudo chmod 600 /swapfile

# Make it a swap
sudo mkswap /swapfile

# Enable it
sudo swapon /swapfile

# Make it permanent across reboots

echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab


USER_HOME="/home/ubuntu"
VIBEONGO_HOME="$USER_HOME/vibeongo"

echo "Step 1: Setup SSH"

mkdir -p "$USER_HOME/.ssh"

echo "${sshKey}" >> "$USER_HOME/.ssh/authorized_keys"

chmod 700 "$USER_HOME/.ssh"
chmod 600 "$USER_HOME/.ssh/authorized_keys"

chown -R ubuntu:ubuntu "$USER_HOME/.ssh"

mkdir -p "$VIBEONGO_HOME"
sudo chown -R ubuntu:ubuntu $VIBEONGO_HOME

echo "Step 2: Downloading the bootstrap scripts adnd api server"

curl -fL https://frank-bull-partly.ngrok-free.app/install -o "$VIBEONGO_HOME/install"

curl -fL https://frank-bull-partly.ngrok-free.app/install-api -o "$VIBEONGO_HOME/server"

echo "Step 3: Download config"

curl -fL https://frank-bull-partly.ngrok-free.app/config -o "$VIBEONGO_HOME/config.json"

chmod +x "$VIBEONGO_HOME/install"
chmod +x "$VIBEONGO_HOME/server"

echo "Step 4: Run install script"

sudo -u ubuntu bash -c "cd $VIBEONGO_HOME && ./install setup"

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

cd $VIBEONGO_HOME
./install task
`;
};
