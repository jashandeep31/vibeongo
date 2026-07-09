import {
  and,
  db,
  eq,
  instanceRegions,
  instances,
  instanceTypes,
  projects,
  userWallet,
} from "@repo/db";
import { awsSupportedRegions } from "../../aws/configs/aws-supported-regions-configs.js";
import { createEc2Instance } from "../../aws/services/create-ec2-instance.js";
import { AppError } from "../../lib/app-error.js";
import { getInstancePublicAddress } from "../../aws/services/get-instance-public-address.js";
import { env } from "../../lib/env.js";
import { createId } from "@paralleldrive/cuid2";
import {
  getUserInstanceAutoTerminateMinutes,
  type InstanceAutoTerminateSetting,
} from "./get-user-instance-auto-terminate-minutes.js";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";
import * as crypto from "crypto";
import { uniqueNamesGenerator, animals, colors } from "unique-names-generator";

interface SpinUpAndSaveInstance {
  sshKeys: string[];
  project: typeof projects.$inferSelect;
  userId: string;
  sessionId: string;
  instanceId: string;
  terminate?: boolean;
  terminateAfterInMinutes?: number;
  terminateSetting?: InstanceAutoTerminateSetting;
}
export type spinUpAndSaveInstanceResponse =
  | typeof instances.$inferSelect
  | null;

/**
 * Create a aws ec2 instance as per the specs and save it to the user database. So after the response you are ready to no db saving is needed
 */
export const spinUpAndSaveInstance = async ({
  sshKeys,
  project,
  userId,
  sessionId,
  instanceId,
  terminate = false,
  terminateAfterInMinutes,
  terminateSetting = "manual",
}: SpinUpAndSaveInstance): Promise<spinUpAndSaveInstanceResponse> => {
  const sessionToken = `vps_${createId()}${crypto.randomBytes(16).toString("hex")}`;

  const setupScript = setupInstanceScript({
    sshKey: sshKeys.join("\n"),
    authToken: sessionToken,
    projectSessionId: sessionId,
    instanceId,
  });
  const [userWalletRow] = await db
    .select()
    .from(userWallet)
    .where(eq(userWallet.user_id, userId));
  if (!userWalletRow) {
    throw new AppError("User not found", 404);
  }

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

  const twoHourCost = row.instanceType.price_per_hour * 2;
  const requiredBalance = Math.ceil(
    twoHourCost + twoHourCost * (env.PROFIT_PRECENTAGE / 100),
  );

  if (userWalletRow.balance < requiredBalance) {
    throw new AppError("Insufficient balance", 400);
  }
  // TODO: Another temp fix
  const runningInstances = await db
    .select()
    .from(instances)
    .where(and(eq(instances.user_id, userId), eq(instances.state, "running")));

  if (runningInstances.length > 4) {
    throw new AppError("You can only have 4 instances running at a time", 400);
  }

  const awsRes = await createEc2Instance({
    region: region.slug as (typeof awsSupportedRegions)[number],
    instanceType: instanceType.name,
    userData: setupScript,
  });

  // Getting first instance of the list as we only spin up the one
  const awsInstance = awsRes?.Instances?.[0];
  if (!awsInstance?.InstanceId || !awsInstance)
    throw new AppError("Failed to create the ec2", 500);

  const autoTerminateAfterInMinutes =
    terminateAfterInMinutes ??
    (await getUserInstanceAutoTerminateMinutes(userId, terminateSetting));

  await new Promise<void>((res) => setTimeout(res, 5000));
  const publicIpAddress = await getInstancePublicAddress(
    awsInstance.InstanceId,
    region.slug as (typeof awsSupportedRegions)[number],
  );

  const [instance] = await db
    .insert(instances)
    .values({
      name: uniqueNamesGenerator({
        dictionaries: [colors, animals],
        style: "capital",
        separator: " ",
      }),
      id: instanceId,
      project_id: project.id,
      user_id: userId,
      instance_type_id: project.instance_type_id,
      aws_instance_id: awsInstance.InstanceId,
      terminated_at: null,
      terminates_at: new Date(
        new Date().getTime() + autoTerminateAfterInMinutes * 60 * 1000,
      ),
      started_at: new Date(),
      public_ip: publicIpAddress,
      state: "running",
      project_session_id: sessionId,
      config: {
        opencodePassword: createId(),
        terminate,
        vibeongoLocalToken: createId(),
        sessionToken: sessionToken,
      },
    })
    .returning();

  return instance || null;
};
