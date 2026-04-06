import {
  db,
  eq,
  instanceRegions,
  instances,
  instanceTypes,
  projects,
} from "@repo/db";
import { awsSupportedRegions } from "../../aws/configs/aws-supported-regions-configs.js";
import { createEc2Instance } from "../../aws/services/create-ec2-instance.js";
import { AppError } from "../../lib/app-error.js";
import { getInstancePublicAddress } from "../../aws/services/get-instance-public-address.js";

interface SpinUpAndSaveInstance {
  setupScript: string;
  project: typeof projects.$inferSelect;
  userId: string;
}

export const spinUpAndSaveInstance = async ({
  setupScript,
  project,
  userId,
}: SpinUpAndSaveInstance) => {
  const [row] = await db
    .select({ region: instanceRegions })
    .from(instanceTypes)
    .innerJoin(instanceRegions, eq(instanceRegions.id, instanceTypes.region_id))
    .where(eq(instanceTypes.id, project.instance_type_id));

  if (!row?.region) {
    return null;
  }
  const region = row.region;

  const awsRes = await createEc2Instance({
    region: region.slug as (typeof awsSupportedRegions)[number],
    instanceType: project.instance_type_id,
    userData: setupScript,
  });

  // Getting first instance of the list as we only spin up the one
  const awsInstance = awsRes?.Instances?.[0];
  if (!awsInstance?.InstanceId || !awsInstance)
    throw new AppError("Failed to create the ec2", 500);

  await new Promise<void>((res) => setTimeout(res, 5000));
  const publicIpAddress = await getInstancePublicAddress(
    awsInstance.InstanceId,
    region.slug as (typeof awsSupportedRegions)[number],
  );

  const [instance] = await db
    .insert(instances)
    .values({
      project_id: project.id,
      user_id: userId,
      instance_type_id: project.instance_type_id,
      aws_instance_id: awsInstance.InstanceId,
      terminated_at: null,
      started_at: new Date(),
      public_ip: publicIpAddress,
      state: "running",
    })
    .returning();

  return instance;
};
