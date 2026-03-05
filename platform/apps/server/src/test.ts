import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "./aws/ec2-client.js";

export default async function test() {
  console.log("Getting the ip from the server");
  if (1 == 1) return;

  console.log(`Test server in running`);
}
