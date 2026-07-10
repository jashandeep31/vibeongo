// import { awsSupportedRegions } from "./aws-supported-regions-configs.js";

// export const ec2RegionImageIds: {
//   region: (typeof awsSupportedRegions)[number];
//   linuxImageId: string;
// }[] = [
//   {
//     region: "ap-south-1",
//     linuxImageId: "ami-0984c70bbe282f599",
//   },
//   { region: "us-east-1", linuxImageId: "ami-021dce13887b692e1" },
// ] as const;
//
// // export const getAWSLinuxAmis = async () => {
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
