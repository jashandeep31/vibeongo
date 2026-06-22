"use server";

import { getEc2Client, ValidRegion } from "@/lib/aws-clients";
import { checkAdmin } from "@/lib/get-session";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";

export const getRunningInstances = async (region: ValidRegion) => {
  await checkAdmin();
  const client = getEc2Client(region);

  const command = new DescribeInstancesCommand({});
  return await client.send(command);
};
