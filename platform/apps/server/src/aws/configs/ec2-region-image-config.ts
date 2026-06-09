import { DescribeImagesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../ec2-client.js";
import { awsSupportedRegions } from "./aws-supported-regions-configs.js";

//TODO:: make the ids automated using aws fetching current or same version for all the regions
export const ec2RegionImageIds: {
  region: (typeof awsSupportedRegions)[number];
  linuxImageId: string;
}[] = [
  {
    region: "ap-south-1",
    linuxImageId: "ami-03a8d1bdc8d37aeeb",
  },
] as const;

// export const getAWSLinuxAmis = async () => {
//   console.log(`amis is running `);
//   const command = new DescribeImagesCommand({
//     Owners: [],
//     // Filters: [{ Name: "platform", Values: ["windows"] }],
//     // Filters: [{ Name: "platform", Values: ["amazon"] }],
//     //
//     Filters: [
//       { Name: "name", Values: ["amzn2-ami-hvm-*"] }, // Amazon Linux 2
//       { Name: "state", Values: ["available"] },
//       { Name: "architecture", Values: ["x86_64"] },
//     ],
//   });
//   const client = getEc2Client("us-east-1");
//   const res = await client.send(command);
//
//   console.log(res);
// };
