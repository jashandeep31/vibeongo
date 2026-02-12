import { TerminateInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../ec2-client.js";

/**
 * terminate the ec2 instance
 */
export const terminateEc2Instance = async (ids: string[]) => {
  const command = new TerminateInstancesCommand({
    InstanceIds: ids,
  });
  const client = getEc2Client("us-east-1");
  return await client.send(command);
};
