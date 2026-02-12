import { EC2Client, RunInstancesCommand } from "@aws-sdk/client-ec2";
import { env } from "../lib/env";

const createEc2Client = (region: string) => {
  return new EC2Client({
    region: region,
    credentials: {
      accessKeyId: env.AWS_EC2_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_EC2_ACCESS_KEY_SECRET,
    },
  });
};

//TODO: create the upgraded if needed
export const createEc2Instance = async () => {
  const command = new RunInstancesCommand({
    ImageId: "ami-0c1fe732b5494dc14", //the version of os,
    InstanceType: "t3.micro",
    MinCount: 1,
    MaxCount: 1,

    Monitoring: {
      Enabled: false, // enable in future it's paid
    },

    // SecurityGroupIds: [],
    //
    // SubnetId: "subnet-abc123",

    // TagSpecifications: [
    //   {
    //     ResourceType: "instance",
    //     Tags: [{ Key: "Name", Value: "MyCustomServer" }],
    //   },
    // ],

    // things we wanna run in the server
    UserData: Buffer.from(
      `#!/bin/bash
set -e

USER="ec2-user"
HOME_DIR="/home/$USER"

mkdir -p $HOME_DIR/.ssh
echo "${env.SSH_KEY}" >> $HOME_DIR/.ssh/authorized_keys

chmod 700 $HOME_DIR/.ssh
chmod 600 $HOME_DIR/.ssh/authorized_keys
chown -R $USER:$USER $HOME_DIR/.ssh

echo "SSH key added successfully"
`,
    ).toString("base64"),
  });
  const client = createEc2Client("us-east-1");

  const res = await client.send(command);
  console.log(res);
};
