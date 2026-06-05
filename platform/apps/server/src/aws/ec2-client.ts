import { EC2Client } from "@aws-sdk/client-ec2";
import { env } from "../lib/env.js";
import { awsSupportedRegions } from "./configs/aws-supported-regions-configs.js";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";

export const getEc2Client = (region: (typeof awsSupportedRegions)[number]) => {
  return new EC2Client({
    region: region,
    credentials: {
      accessKeyId: env.AWS_EC2_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_EC2_ACCESS_KEY_SECRET,
    },
  });
};

export const getCloudWatchClient = (
  region: (typeof awsSupportedRegions)[number],
) =>
  new CloudWatchClient({
    region: region,
    credentials: {
      accessKeyId: env.AWS_EC2_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_EC2_ACCESS_KEY_SECRET,
    },
  });
