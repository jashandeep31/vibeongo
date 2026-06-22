"use server";

import { getEc2Client, type ValidRegion } from "@/lib/aws-clients";
import { checkAdmin } from "@/lib/get-session";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";

export type InstanceStateFilter = "running" | "all";

export const getRunningInstances = async (
  region: ValidRegion,
  stateFilter: InstanceStateFilter = "running",
) => {
  await checkAdmin();
  const client = getEc2Client(region);

  const command = new DescribeInstancesCommand({
    Filters:
      stateFilter === "running"
        ? [
            {
              Name: "instance-state-name",
              Values: ["running"],
            },
          ]
        : undefined,
  });
  const res = await client.send(command);

  return (res.Reservations ?? [])
    .flatMap((reservation) => reservation.Instances ?? [])
    .sort((a, b) => {
      const aLaunchedAt = a.LaunchTime ? a.LaunchTime.getTime() : 0;
      const bLaunchedAt = b.LaunchTime ? b.LaunchTime.getTime() : 0;

      return bLaunchedAt - aLaunchedAt;
    });
};
