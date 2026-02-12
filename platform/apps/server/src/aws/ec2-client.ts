import { EC2Client } from "@aws-sdk/client-ec2";
import { env } from "../lib/env.js";

export const createAndGetEc2Client = (region: string) => {
  return new EC2Client({
    region: region,
    credentials: {
      accessKeyId: env.AWS_EC2_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_EC2_ACCESS_KEY_SECRET,
    },
  });
};
