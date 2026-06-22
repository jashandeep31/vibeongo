import { EC2Client } from "@aws-sdk/client-ec2";
import { ImagebuilderClient } from "@aws-sdk/client-imagebuilder";

export const validRegions = ["us-east-1", "ap-south-1"] as const;
export type ValidRegion = (typeof validRegions)[number];

export const getEc2Client = (region: ValidRegion) => {
  return new EC2Client({
    region: region,
    credentials: {
      accessKeyId: process.env.AWS_EC2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_EC2_ACCESS_KEY_SECRET ?? "",
    },
  });
};

export const getImageBuilderClient = (region: ValidRegion) => {
  return new ImagebuilderClient({
    region: region,
    credentials: {
      accessKeyId: process.env.AWS_EC2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_EC2_ACCESS_KEY_SECRET ?? "",
    },
  });
};
