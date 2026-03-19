import { RunInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../../ec2-client.js";
import { env } from "../../../lib/env.js";
import { awsSupportedRegions } from "../../configs/aws-supported-regions-configs.js";
import { ec2RegionImageIds } from "../../configs/ec2-region-image-config.js";

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
    // TODO: things i have to handle
    // 1. get the boosstrap server and run
    UserData: Buffer.from(
      `#!/usr/bin/env bash
set -euxo pipefail

exec > /var/log/user-data.log 2>&1

USER_HOME="/home/ubuntu"

mkdir -p "$USER_HOME/.ssh"

echo "${env.SSH_KEY}" >> "$USER_HOME/.ssh/authorized_keys"

chmod 700 "$USER_HOME/.ssh"
chmod 600 "$USER_HOME/.ssh/authorized_keys"

chown -R ubuntu:ubuntu "$USER_HOME/.ssh"

echo "SSH key added successfully

curl -fL https://l1.devsradar.com/install -o /home/ubuntu/install

chmod +x /home/ubuntu/install

/home/ubuntu/install
"`,
    ).toString("base64"),
  });
  const client = getEc2Client(region);

  return await client.send(command);
};
