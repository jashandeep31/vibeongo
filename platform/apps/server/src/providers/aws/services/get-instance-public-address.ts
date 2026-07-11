import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../ec2-client.js";
import type { AwsSupportedRegion } from "../../types.js";

const MAX_PUBLIC_ADDRESS_LOOKUP_ATTEMPTS = 12;
const PUBLIC_ADDRESS_LOOKUP_DELAY_MS = 2_000;

export const getInstancePublicAddress = async (
  id: string,
  region: AwsSupportedRegion,
): Promise<string | undefined> => {
  const awsClient = getEc2Client(region);

  for (let attempt = 1; attempt <= MAX_PUBLIC_ADDRESS_LOOKUP_ATTEMPTS; attempt++) {
    const res = await awsClient.send(
      new DescribeInstancesCommand({
        InstanceIds: [id],
      }),
    );

    const publicIpAddress = res.Reservations?.flatMap(
      (reservation) => reservation.Instances ?? [],
    ).find((instance) => instance.InstanceId === id)?.PublicIpAddress;

    if (publicIpAddress) {
      return publicIpAddress;
    }

    if (attempt < MAX_PUBLIC_ADDRESS_LOOKUP_ATTEMPTS) {
      await wait(PUBLIC_ADDRESS_LOOKUP_DELAY_MS);
    }
  }
};

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));
