import {
  _InstanceType,
  DescribeInstancesCommand,
  RunInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import { CreateAwsInstanceProps } from "../../types.js";
import { getEc2Client } from "../ec2-client.js";
import { AppError } from "../../../lib/app-error.js";
import { db, eq, instanceRegions } from "@repo/db";
import { awsSupportedRegions } from "../configs/aws-supported-regions-configs.js";

const MAX_INSTANCE_IP_LOOKUP_ATTEMPTS = 12;
const UNAVAILABLE_IP_ADDRESSES = {
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

const waitBeforeRetry = async (attempt: number) => {
  const exponentialDelay = Math.min(1_000 * 2 ** attempt, 5_000);
  const jitter = Math.round(exponentialDelay * Math.random() * 0.2);
  await new Promise<void>((resolve) =>
    setTimeout(resolve, exponentialDelay + jitter),
  );
};

export class AWSClient {
  constructor() {}

  async createInstance({
    region,
    instanceType,
    userData,
  }: CreateAwsInstanceProps) {
    const [regionRow] = await db
      .select()
      .from(instanceRegions)
      .where(eq(instanceRegions.slug, region));
    if (!regionRow) throw new AppError("Not a valid region ", 404);

    const command = new RunInstancesCommand({
      ImageId: regionRow.ami,
      InstanceType: instanceType as _InstanceType,
      MinCount: 1,
      MaxCount: 1,
      Monitoring: {
        Enabled: true,
      },
      UserData: Buffer.from(userData).toString("base64"),
      BlockDeviceMappings: [
        {
          DeviceName: "/dev/sda1", // root volume device name for Ubuntu AMIs
          Ebs: {
            VolumeSize: 20, // GB
            VolumeType: "gp3",
            DeleteOnTermination: true,
          },
        },
      ],
    });
    const client = getEc2Client(region);

    return await client.send(command);
  }
  async temrinateInstance(region: string, ids: string[]) {
    const command = new TerminateInstancesCommand({
      InstanceIds: ids,
    });
    // Temp solution of types may need to fix
    const client = getEc2Client(region as (typeof awsSupportedRegions)[number]);
    return await client.send(command);
  }
  async getIPs(id: string, region: (typeof awsSupportedRegions)[number]) {
    const awsClient = getEc2Client(region);

    for (
      let attempt = 0;
      attempt < MAX_INSTANCE_IP_LOOKUP_ATTEMPTS;
      attempt++
    ) {
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
  }
}
