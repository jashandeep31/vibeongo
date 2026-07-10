import { _InstanceType, RunInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../ec2-client.js";
import { awsSupportedRegions } from "../configs/aws-supported-regions-configs.js";
import { db, eq, instanceRegions } from "@repo/db";
import { AppError } from "../../../lib/app-error.js";

/**
 * Create a ec2 instance depending upon the user requirnments
 */
export const createAWSInstance = async ({
  region,
  instanceType,
  userData,
}: {
  region: (typeof awsSupportedRegions)[number];
  instanceType: string;
  userData: string;
}) => {
  const [regionRow] = await db
    .select()
    .from(instanceRegions)
    .where(eq(instanceRegions.slug, region));
  if (!regionRow) throw new AppError("Not a valid region ", 404);

  const command = new RunInstancesCommand({
    ImageId: regionRow.ami,
    InstanceType: instanceType as _InstanceType,
    MinCount: 1,
    MaxCount: 1,
    Monitoring: {
      Enabled: true,
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
