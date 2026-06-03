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
  sessionId: null | string;
  instanceId: string;
}
export type spinUpAndSaveInstanceResponse =
  | typeof instances.$inferSelect
  | null;

/**
 * Create a aws ec2 instance as per the specs and save it to the user database. So after the response you are ready to no db saving is needed
 */
export const spinUpAndSaveInstance = async ({
  setupScript,
  project,
  userId,
  sessionId = null,
  instanceId,
}: SpinUpAndSaveInstance): Promise<spinUpAndSaveInstanceResponse> => {
  const [row] = await db
    .select({ instanceType: instanceTypes, region: instanceRegions })
    .from(instanceTypes)
    .innerJoin(instanceRegions, eq(instanceRegions.id, instanceTypes.region_id))
    .where(eq(instanceTypes.id, project.instance_type_id));

  if (!row?.region || !row.instanceType) {
    return null;
  }
  const region = row.region;
  const instanceType = row.instanceType;

  const awsRes = await createEc2Instance({
    region: region.slug as (typeof awsSupportedRegions)[number],
    instanceType: instanceType.name,
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
      id: instanceId,
      project_id: project.id,
      user_id: userId,
      instance_type_id: project.instance_type_id,
      aws_instance_id: awsInstance.InstanceId,
      terminated_at: null,
      started_at: new Date(),
      public_ip: publicIpAddress,
      state: "running",
      project_session_id: sessionId,
    })
    .returning();

  return instance || null;
};
