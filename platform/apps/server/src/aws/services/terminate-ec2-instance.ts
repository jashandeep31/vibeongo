import { TerminateInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../ec2-client.js";
import { awsSupportedRegions } from "../configs/aws-supported-regions-configs.js";

/**
 * terminate the ec2 instance
 */
export const terminateEc2Instance = async (region: string, ids: string[]) => {
  const command = new TerminateInstancesCommand({
    InstanceIds: ids,
  });
  // Temp solution of types may need to fix
  const client = getEc2Client(region as (typeof awsSupportedRegions)[number]);
  return await client.send(command);
};
