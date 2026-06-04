import { _InstanceType, RunInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../ec2-client.js";
import { awsSupportedRegions } from "../configs/aws-supported-regions-configs.js";
import { ec2RegionImageIds } from "../configs/ec2-region-image-config.js";
import { env } from "../../lib/env.js";

/**
 * Create a ec2 instance depending upon the user requirnments
 */
export const createEc2Instance = async ({
  region,
  instanceType,
  userData,
}: {
  region: (typeof awsSupportedRegions)[number];
  instanceType: string;
  userData: string;
}) => {
  const imageConfig = ec2RegionImageIds.find((item) => item.region === region);
  if (!imageConfig)
    throw new Error("Regions isn't suppported yet for ec2 deployment");

  if (!Object.values(_InstanceType).includes(instanceType as _InstanceType)) {
    throw new Error(`Unsupported EC2 instance type: ${instanceType}`);
  }

  const command = new RunInstancesCommand({
    // ImageId: imageConfig.linuxImageId, //the version of os,
    ImageId: env.AMI_ID, //the version of os,
    InstanceType: instanceType as _InstanceType,
    MinCount: 1,
    MaxCount: 1,

    Monitoring: {
      Enabled: false, // enable in future it's paid
    },
    UserData: Buffer.from(userData).toString("base64"),
    BlockDeviceMappings: [
      {
        DeviceName: "/dev/sda1", // root volume device name for Ubuntu AMIs
        Ebs: {
          VolumeSize: 20, // GB
          VolumeType: "gp3",
          DeleteOnTermination: true,
        },
      },
    ],
  });
  const client = getEc2Client(region);

  return await client.send(command);
};
