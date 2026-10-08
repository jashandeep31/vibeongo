import { randomUUID } from "node:crypto";
import { and, db, eq, instances, sandboxTypes, sql } from "@repo/db";
import { MAX_BOAT_EXTENSION_MINUTES } from "@repo/shared/providers";
import { z } from "zod";
import { lockNames, withRedisLock } from "../../cache/redis-lock.js";
import { addTerminateOrPauseInstanceJob } from "../../jobs/terminate-or-pause-instance.js";
import { AppError } from "../../lib/app-error.js";
import { BoatClient } from "../../providers/client/boat-client.js";
import { PROVIDER_TERMINATION_GRACE_MINUTES } from "../../providers/constants.js";

const boatClient = new BoatClient();
const RECEIPT_KEY = "runtimeTimeUpdate";
const receiptSchema = z.object({
  requestId: z.string(),
  action: z.enum(["increase", "decrease"]),
  timeInMinutes: z.number(),
  targetTime: z.number(),
  status: z.enum(["pending", "done"]),
});
type Receipt = z.infer<typeof receiptSchema>;
type Instance = typeof instances.$inferSelect;
type UpdateTimeInput = {
  id: string;
  userId: string;
  action: "increase" | "decrease";
  timeInMinutes: number;
  requestId?: string | undefined;
};

const getOwnedInstance = async (id: string, userId: string) => {
  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, id), eq(instances.user_id, userId)));
  if (!instance) throw new AppError("Instance not found", 404);
  return instance;
};

const receiptConfig = (receipt: Receipt) =>
  sql`(COALESCE(${instances.config}::jsonb, '{}'::jsonb) || ${JSON.stringify({ [RECEIPT_KEY]: receipt })}::jsonb)::json`;

async function saveExpiration(
  instance: Instance,
  receipt: Receipt,
  deadline: Date,
) {
  const [updated] = await db
    .update(instances)
    .set({
      terminates_at: deadline,
      updated_at: new Date(),
      config: receiptConfig({ ...receipt, status: "done" }),
    })
    .where(
      and(
        eq(instances.id, instance.id),
        eq(instances.user_id, instance.user_id),
        eq(instances.state, "running"),
      ),
    )
    .returning();
  if (!updated) throw new AppError("Running instance not found", 409);
  await rescheduleExpiration(instance.id);
  return updated;
}

async function rescheduleExpiration(instanceId: string) {
  try {
    await addTerminateOrPauseInstanceJob({
      instanceId,
      action: "terminate",
      autoExpire: true,
    });
  } catch (error) {
    // The existing expiry worker rechecks terminates_at; cron also recovers jobs.
    console.error(
      "Could not reschedule instance expiration",
      instanceId,
      error,
    );
  }
}

async function applyBoatExtension(instance: Instance, receipt: Receipt) {
  let deadline: Date;
  try {
    const response = await boatClient.extendTime(
      instance.provider_instance_id,
      receipt.timeInMinutes,
      new Date(
        receipt.targetTime + PROVIDER_TERMINATION_GRACE_MINUTES * 60_000,
      ),
    );
    const sandbox = response.sandbox;
    const archiveAfter = sandbox.archiveAfter?.getTime();
    if (
      sandbox.id !== instance.provider_instance_id ||
      !["ready", "idle", "running"].includes(sandbox.state) ||
      archiveAfter === undefined ||
      !Number.isFinite(archiveAfter)
    ) {
      throw new AppError("Boat returned an invalid extension deadline", 502);
    }
    deadline = new Date(
      archiveAfter - PROVIDER_TERMINATION_GRACE_MINUTES * 60_000,
    );
    if (
      deadline.getTime() <=
      Math.max(Date.now(), instance.terminates_at.getTime())
    ) {
      await db
        .update(instances)
        .set({
          config: sql`(${instances.config}::jsonb - ${RECEIPT_KEY})::json`,
        })
        .where(
          and(
            eq(instances.id, instance.id),
            eq(instances.user_id, instance.user_id),
          ),
        );
      throw new AppError(
        response.giftLimitNotice ||
          "Boat's account limit does not allow this time extension",
        409,
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(
      "Boat time extension could not be confirmed",
      instance.id,
      error,
    );
    throw new AppError(
      "Boat could not confirm the time extension. Retry with the same minutes.",
      502,
    );
  }

  try {
    return await saveExpiration(instance, receipt, deadline);
  } catch (error) {
    // The pending target was saved before calling Boat. Retrying it sets the same
    // absolute deadline, reconciling provider success without adding minutes twice.
    console.error(
      "Boat extended time but the database update failed",
      instance.id,
      deadline,
      error,
    );
    throw new AppError(
      "Boat extended the time, but saving it failed. Retry with the same minutes to synchronize it.",
      503,
    );
  }
}

export async function updateInstanceExpiration(input: UpdateTimeInput) {
  await getOwnedInstance(input.id, input.userId);
  const lock = await withRedisLock(
    lockNames.instanceLifecycle(input.id),
    async () => {
      const instance = await getOwnedInstance(input.id, input.userId);
      if (
        instance.state !== "running" ||
        instance.terminates_at.getTime() <= Date.now()
      ) {
        throw new AppError(
          "Only a running, unexpired instance can update its time",
          409,
        );
      }

      const isSandbox = instance.runtime_kind === "sandbox";
      if (isSandbox) {
        const [sandbox] = await db
          .select({ provider: sandboxTypes.provider })
          .from(sandboxTypes)
          .where(eq(sandboxTypes.id, instance.sandbox_type_id!));
        if (!sandbox) throw new AppError("Sandbox type not found", 404);
        if (sandbox.provider !== "boat") {
          throw new AppError(
            "Time extension is only supported for Boat sandboxes.",
            400,
          );
        }
        if (input.action !== "increase") {
          throw new AppError("Boat sandboxes only support adding time", 400);
        }
        if (
          !Number.isSafeInteger(input.timeInMinutes) ||
          input.timeInMinutes < 1 ||
          input.timeInMinutes > MAX_BOAT_EXTENSION_MINUTES
        ) {
          throw new AppError(
            `Boat extensions must add 1–${MAX_BOAT_EXTENSION_MINUTES} whole minutes`,
            400,
          );
        }
      }

      const config =
        instance.config && typeof instance.config === "object"
          ? (instance.config as Record<string, unknown>)
          : {};
      const stored = receiptSchema.safeParse(config[RECEIPT_KEY]);
      if (stored.success && stored.data.requestId === input.requestId) {
        if (
          stored.data.action !== input.action ||
          stored.data.timeInMinutes !== input.timeInMinutes
        ) {
          throw new AppError(
            "This time-update request was already used with different minutes",
            409,
          );
        }
        if (stored.data.status === "done") {
          await rescheduleExpiration(instance.id);
          return instance;
        }
      }
      if (isSandbox && stored.success && stored.data.status === "pending") {
        // Reconcile the outstanding operation first, including after a page reload.
        // Return it to the caller; a subsequent request can add more time.
        const reconciled = await applyBoatExtension(instance, stored.data);
        if (
          stored.data.timeInMinutes !== input.timeInMinutes ||
          stored.data.action !== input.action
        ) {
          throw new AppError(
            "The previous extension was synchronized. Submit your new extension again.",
            409,
          );
        }
        return reconciled;
      }

      const targetTime =
        instance.terminates_at.getTime() +
        (input.action === "decrease" ? -1 : 1) * input.timeInMinutes * 60_000;
      if (!Number.isFinite(new Date(targetTime).getTime())) {
        throw new AppError("Requested expiration is too large", 400);
      }
      const receipt: Receipt = {
        requestId: input.requestId ?? randomUUID(),
        action: input.action,
        timeInMinutes: input.timeInMinutes,
        targetTime,
        status: "pending",
      };
      if (!isSandbox)
        return saveExpiration(instance, receipt, new Date(targetTime));

      // Persist the target before the SDK call so retries can reconcile it.
      await db
        .update(instances)
        .set({ config: receiptConfig(receipt) })
        .where(
          and(
            eq(instances.id, instance.id),
            eq(instances.user_id, input.userId),
            eq(instances.state, "running"),
          ),
        );
      return applyBoatExtension(instance, receipt);
    },
  );
  if (!lock.acquired) {
    throw new AppError(
      "Another instance operation is in progress. Please try again shortly.",
      409,
    );
  }
  return lock.result;
}
