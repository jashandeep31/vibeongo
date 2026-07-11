import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { getEc2Client } from "../ec2-client.js";
import type { AwsSupportedRegion, InstanceIpAddresses } from "../../types.js";

const MAX_INSTANCE_IP_LOOKUP_ATTEMPTS = 12;
const UNAVAILABLE_IP_ADDRESSES: InstanceIpAddresses = {
  publicIPv4: "N/A",
  pvtIPv4: "N/A",
};

const isRetryableAwsError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const name = "name" in error ? error.name : undefined;
  if (name === "InvalidInstanceID.NotFound") return true;

  const metadata =
    "$metadata" in error &&
    error.$metadata &&
    typeof error.$metadata === "object"
      ? error.$metadata
      : undefined;
  const status =
    metadata &&
    "httpStatusCode" in metadata &&
    typeof metadata.httpStatusCode === "number"
      ? metadata.httpStatusCode
      : undefined;

  return status === undefined || status === 429 || status >= 500;
};

export const getInstanceIpAddresses = async (
  id: string,
  region: AwsSupportedRegion,
): Promise<InstanceIpAddresses> => {
  const awsClient = getEc2Client(region);

  for (let attempt = 0; attempt < MAX_INSTANCE_IP_LOOKUP_ATTEMPTS; attempt++) {
    try {
      const res = await awsClient.send(
        new DescribeInstancesCommand({
          InstanceIds: [id],
        }),
      );

      const instance = res.Reservations?.flatMap(
        (reservation) => reservation.Instances ?? [],
      ).find((candidate) => candidate.InstanceId === id);

      const addresses = {
        publicIPv4: instance?.PublicIpAddress ?? "N/A",
        pvtIPv4: instance?.PrivateIpAddress ?? "N/A",
      };

      if (
        addresses.publicIPv4 !== "N/A" ||
        attempt === MAX_INSTANCE_IP_LOOKUP_ATTEMPTS - 1
      ) {
        return addresses;
      }
    } catch (error) {
      if (!isRetryableAwsError(error)) throw error;
      if (attempt === MAX_INSTANCE_IP_LOOKUP_ATTEMPTS - 1) {
        return UNAVAILABLE_IP_ADDRESSES;
      }
    }

    await waitBeforeRetry(attempt);
  }

  return UNAVAILABLE_IP_ADDRESSES;
};

const waitBeforeRetry = async (attempt: number) => {
  const exponentialDelay = Math.min(1_000 * 2 ** attempt, 5_000);
  const jitter = Math.round(exponentialDelay * Math.random() * 0.2);
  await new Promise<void>((resolve) =>
    setTimeout(resolve, exponentialDelay + jitter),
  );
};
