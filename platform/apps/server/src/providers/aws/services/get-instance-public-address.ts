import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { awsSupportedRegions } from "../configs/aws-supported-regions-configs.js";
import { getEc2Client } from "../ec2-client.js";

export const getInstancePublicAddress = async (
  id: string,
  region: (typeof awsSupportedRegions)[number],
): Promise<string | undefined> => {
  const awsClient = getEc2Client(region);
  const command = new DescribeInstancesCommand({
    InstanceIds: [id],
  });
  const res = await awsClient.send(command);
  if (res.Reservations) {
    for (const reservation of res.Reservations) {
      for (const instance of reservation.Instances ?? []) {
        if (instance.InstanceId === id) {
          return instance.PublicIpAddress;
        }
      }
    }
  }
};
