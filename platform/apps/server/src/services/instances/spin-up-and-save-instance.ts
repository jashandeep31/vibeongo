import {
  and,
  db,
  eq,
  instanceRegions,
  instances,
  instanceTypes,
  sandboxRegions,
  sandboxTypes,
  projects,
  userWallet,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import { createId } from "@paralleldrive/cuid2";
import {
  getUserInstanceAutoTerminateMinutes,
  type InstanceAutoTerminateSetting,
} from "./get-user-instance-auto-terminate-minutes.js";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";
import * as crypto from "crypto";
import { createProviderInstance } from "../../providers/create-providers-instance.js";
import type { InstanceRuntime } from "../../providers/types.js";

interface SpinUpAndSaveInstanceInput {
  sshKeys: string[];
  project: typeof projects.$inferSelect;
  userId: string;
  sessionId: string;
  instanceId: string;
  runtime?: InstanceRuntime;
  terminate?: boolean;
  terminateAfterInMinutes?: number;
  terminateSetting?: InstanceAutoTerminateSetting;
}
export type spinUpAndSaveInstanceResponse =
  | typeof instances.$inferSelect
  | null;

/**
 * Create a provider-backed VM and save it to the user database.
 */
export const spinUpAndSaveInstance = async ({
  sshKeys,
  project,
  userId,
  sessionId,
  instanceId,
  runtime = "sandbox",
  terminate = false,
  terminateAfterInMinutes,
  terminateSetting = "manual",
}: SpinUpAndSaveInstanceInput): Promise<spinUpAndSaveInstanceResponse> => {
  const sessionToken = `vps_${createId()}${crypto.randomBytes(16).toString("hex")}`;

  const [userWalletRow] = await db
    .select()
    .from(userWallet)
    .where(eq(userWallet.user_id, userId));
  if (!userWalletRow) {
    throw new AppError("User not found", 404);
  }

  let requiredBalance: number;
  let instanceTypeId: string | null = null;
  let sandboxTypeId: string | null = null;
  let newInstance: Awaited<ReturnType<typeof createProviderInstance>>;

  const autoTerminateAfterInMinutes =
    terminateAfterInMinutes ??
    (await getUserInstanceAutoTerminateMinutes(userId, terminateSetting));

  if (runtime === "vm") {
    const [row] = await db
      .select({ instanceType: instanceTypes, region: instanceRegions })
      .from(instanceTypes)
      .innerJoin(
        instanceRegions,
        eq(instanceRegions.id, instanceTypes.region_id),
      )
      .where(eq(instanceTypes.id, project.instance_type_id));

    if (!row?.region || !row.instanceType) {
      return null;
    }

    const twoHourCost = row.instanceType.price_per_hour * 2;
    requiredBalance = Math.ceil(
      twoHourCost + twoHourCost * (env.PROFIT_PRECENTAGE / 100),
    );
    instanceTypeId = row.instanceType.id;

    const setupScript = setupInstanceScript({
      sshKey: sshKeys.join("\n"),
      authToken: sessionToken,
      projectSessionId: sessionId,
      instanceId,
    });
    newInstance = await createProviderInstance({
      provider: row.instanceType.provider,
      region: row.region.slug,
      instanceType: row.instanceType.slug,
      runtime,
      userData: setupScript,
      terminatedAfterInMinutes: autoTerminateAfterInMinutes,
    });
  } else {
    const [row] = await db
      .select({ sandboxType: sandboxTypes, region: sandboxRegions })
      .from(sandboxTypes)
      .innerJoin(
        sandboxRegions,
        eq(sandboxRegions.id, sandboxTypes.sandbox_region),
      )
      .where(eq(sandboxTypes.id, project.sandbox_type_id));

    if (!row?.region || !row.sandboxType) {
      return null;
    }

    const twoHourCost = row.sandboxType.price_per_seconds * 60 * 120;
    requiredBalance = Math.ceil(
      twoHourCost + twoHourCost * (env.PROFIT_PRECENTAGE / 100),
    );
    sandboxTypeId = row.sandboxType.id;

    if (userWalletRow.balance < 0.01) {
      throw new AppError(
        `Insufficient balance required is ${requiredBalance} you have ${userWalletRow.balance} `,
        400,
      );
    }
    const setupScript = setupInstanceScript({
      sshKey: sshKeys.join("\n"),
      authToken: sessionToken,
      projectSessionId: sessionId,
      instanceId,
    });
    newInstance = await createProviderInstance({
      provider: row.sandboxType.provider,
      region: row.region.slug,
      instanceType: row.sandboxType.slug,
      runtime,
      userData: setupScript,
      terminatedAfterInMinutes: autoTerminateAfterInMinutes,
    });
  }

  // TODO: Another temp fix
  const time = Date.now();
  const runningInstances = await db
    .select()
    .from(instances)
    .where(and(eq(instances.user_id, userId), eq(instances.state, "running")));

  if (runningInstances.length > 4) {
    throw new AppError("You can only have 4 instances running at a time", 400);
  }

  const [instance] = await db
    .insert(instances)
    .values({
      name: newInstance.instanceName,
      id: instanceId,
      project_id: project.id,
      user_id: userId,
      runtime_kind: runtime,
      instance_type_id: instanceTypeId,
      sandbox_type_id: sandboxTypeId,
      provider_instance_id: newInstance.instanceId,
      terminated_at: null,
      terminates_at: new Date(
        new Date().getTime() + autoTerminateAfterInMinutes * 60 * 1000,
      ),
      started_at: new Date(),
      public_ip: newInstance.publicIPv4,
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

  console.log(time - Date.now());

  return instance || null;
};
