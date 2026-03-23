import { RunInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../ec2-client.js";
import { env } from "../../lib/env.js";
import { awsSupportedRegions } from "../configs/aws-supported-regions-configs.js";
import { ec2RegionImageIds } from "../configs/ec2-region-image-config.js";

/**
 * Create a ec2 instance depending upon the user requirnments
 */
export const createEc2Instance = async ({
  region,
}: {
  region: (typeof awsSupportedRegions)[number];
}) => {
  const imageConfig = ec2RegionImageIds.find((item) => item.region === region);
  if (!imageConfig)
    throw new Error("Regions isn't suppported yet for ec2 deployment");

  const command = new RunInstancesCommand({
    ImageId: imageConfig.linuxImageId, //the version of os,
    InstanceType: "t3.micro",
    MinCount: 1,
    MaxCount: 1,

    Monitoring: {
      Enabled: false, // enable in future it's paid
    },
    UserData: Buffer.from(
      `#!/usr/bin/env bash
set -euxo pipefail

exec > /var/log/user-data.log 2>&1

USER_HOME="/home/ubuntu"

echo "Step 1: Setup SSH"

mkdir -p "$USER_HOME/.ssh"

echo "${env.SSH_KEY}" >> "$USER_HOME/.ssh/authorized_keys"

chmod 700 "$USER_HOME/.ssh"
chmod 600 "$USER_HOME/.ssh/authorized_keys"

chown -R ubuntu:ubuntu "$USER_HOME/.ssh"

echo "Step 2: Download install script"

curl -fL https://l1.devsradar.com/install -o "$USER_HOME/install"

curl -fL https://l1.devsradar.com/install-api -o "$USER_HOME/server"

echo "Step 3: Download config"

curl -fL https://l1.devsradar.com/config -o "$USER_HOME/config.json"

chmod +x "$USER_HOME/install"
chmod +x "$USER_HOME/server"

echo "Step 4: Run install script"

# Run as ubuntu user (IMPORTANT)
sudo -u ubuntu bash -c "cd /home/ubuntu && /home/ubuntu/install"

echo "Step 5: Done"

touch "$USER_HOME/done.txt"
echo "We are done" > "$USER_HOME/done.txt"
echo "Plese reboot the server onces" > "$USER_HOME/done.txt"

source /home/ubuntu/.bashrc

echo "Step 6: Setup systemd service"

cat <<EOF > /etc/systemd/system/myserver.service
[Unit]
Description=My API Server
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/home/ubuntu/server
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

`,
    ).toString("base64"),
  });
  const client = getEc2Client(region);

  return await client.send(command);
};
