import { awsSupportedRegions } from "./aws-supported-regions-configs.js";

//TODO:: make the ids automated using aws fetching current or same version for all the regions
export const ec2RegionImageIds: {
  region: (typeof awsSupportedRegions)[number];
  awsLinuxImageId: string;
}[] = [
  {
    region: "us-east-1",
    awsLinuxImageId: "ami-0c1fe732b5494dc14",
  },
] as const;
//
// export const getAWSLinuxAmis = async () => {
//   console.log(`amis is running `);
//   const command = new DescribeImagesCommand({
//     Owners: ["amazon"],
//     // Filters: [{ Name: "platform", Values: ["windows"] }],
//     // Filters: [{ Name: "platform", Values: ["amazon"] }],
//     //
//     Filters: [
//       { Name: "name", Values: ["amzn2-ami-hvm-*"] }, // Amazon Linux 2
//       { Name: "state", Values: ["available"] },
//       { Name: "architecture", Values: ["x86_64"] },
//     ],
//   });
//   const client = createEc2Client("us-east-1");
//   const res = await client.send(command);
//
//   console.log(res);
// };
//
//
