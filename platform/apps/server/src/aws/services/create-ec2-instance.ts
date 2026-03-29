import { RunInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../ec2-client.js";
import { env } from "../../lib/env.js";
import { awsSupportedRegions } from "../configs/aws-supported-regions-configs.js";
import { ec2RegionImageIds } from "../configs/ec2-region-image-config.js";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";

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
    InstanceType: "t3.small",
    MinCount: 1,
    MaxCount: 1,

    Monitoring: {
      Enabled: false, // enable in future it's paid
    },
    UserData: Buffer.from(setupInstanceScript()).toString("base64"),
  });
  const client = getEc2Client(region);

  return await client.send(command);
};
