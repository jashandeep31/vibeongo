import {
  and,
  db,
  eq,
  instancePeriods,
  instances,
  instanceSlots,
  isNull,
  projectDomainRouting,
  sandboxTypes,
  users,
} from "@repo/db";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { invalidateProjectProxiesByPid } from "../../lib/invalidate-project-proxies-by-pid.js";
import { invalidateCachedProxyPreviews } from "../../cache/proxy-preview-cache.js";
import { E2BClient } from "../../providers/client/e2b-client.js";
import { resumeInstanceScript } from "../../scripts/resume-instance-script.js";
import { tierLimits } from "../../utils/constants.js";
import { createOpenRouterVirtualKeyAndSave } from "../openrouter/index.js";
import { assertUserCanAffordInstanceLaunch } from "./assert-user-can-afford-instance-launch.js";
import { getActiveInstanceSlotCount } from "./get-active-instance-slot-count.js";
import {
  chargeInstancePeriod,
  openInstancePeriod,
} from "./charge-instance-period.js";
import { getOpenRouterKeyLimitInDollars } from "./spin-up-and-save-instance-v2.js";
import { getValidatedAutoTerminateAfterInMinutes } from "./spin-up-and-save-instance.js";
import { addTerminateOrPauseInstanceJob } from "../../jobs/terminate-or-pause-instance.js";

const e2bClient = new E2BClient();

const SANDBOX_USERNAME = "vibe";
const RESUME_SCRIPT_TIMEOUT_MS = 5 * 60 * 1000;

interface ResumeSuspendedSessionProps {
  sessionId: string;
  userId: string;
}

export const resumeSuspendedSession = async ({
  sessionId,
  userId,
}: ResumeSuspendedSessionProps) => {
  const [row] = await db
    .select({ instance: instances, sandboxType: sandboxTypes })
    .from(instances)
    .innerJoin(sandboxTypes, eq(sandboxTypes.id, instances.sandbox_type_id))
    .where(
      and(
        eq(instances.project_session_id, sessionId),
        eq(instances.user_id, userId),
        eq(instances.state, "suspended"),
      ),
    );

  if (!row) {
    throw new AppError("This session has no suspended instance", 404);
  }
  const { instance, sandboxType } = row;
  if (sandboxType.provider !== "e2b") {
    throw new AppError("Only E2B sandboxes can be resumed", 400);
  }

  const reservedSlot = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user) throw new AppError("User not found", 404);

    const [slot] = await tx
      .select()
      .from(instanceSlots)
      .where(
        and(
          eq(instanceSlots.instance_id, instance.id),
          eq(instanceSlots.status, "suspended"),
        ),
      );
    if (!slot) throw new AppError("Suspended instance slot not found", 404);

    await assertUserCanAffordInstanceLaunch({
      tx,
      userId,
      runtime: "sandbox",
      instanceTypeId: null,
      sandboxTypeId: sandboxType.id,
    });

    const activeSlotCount = await getActiveInstanceSlotCount({
      tx,
      userId,
      category: slot.category,
    });
    if (activeSlotCount >= tierLimits[user.tier][slot.category]) {
      throw new AppError(
        "Instance limit reached. Upgrade your plan or wait for a running session to stop.",
        402,
      );
    }

    await tx
      .update(instanceSlots)
      .set({ status: "provisioning", updated_at: new Date() })
      .where(eq(instanceSlots.id, slot.id));

    return slot;
  });

  const autoTerminateAfterInMinutes =
    await getValidatedAutoTerminateAfterInMinutes({
      runtime: "sandbox",
      terminateAfterInMinutes: undefined,
      userId,
      terminateSetting: z
        .enum(["manual", "pr", "issue", "automation"])
        .catch("manual")
        .parse(reservedSlot.spun_up_by),
    });

  try {
    await e2bClient.resumeInstance(
      instance.provider_instance_id,
      autoTerminateAfterInMinutes * 60 * 1000,
    );
  } catch (error) {
    await db
      .update(instanceSlots)
      .set({ status: "suspended", updated_at: new Date() })
      .where(eq(instanceSlots.id, reservedSlot.id));
    console.error(`Could not resume the E2B sandbox of ${instance.id}`, error);
    throw new AppError("Could not resume the instance. Please try again.", 502);
  }

  const resumedAt = new Date();
  await db.transaction(async (tx) => {
    const [resumedInstance] = await tx
      .update(instances)
      .set({
        state: "running",
        started_at: resumedAt,
        terminates_at: new Date(
          resumedAt.getTime() + autoTerminateAfterInMinutes * 60 * 1000,
        ),
        updated_at: resumedAt,
      })
      .where(
        and(eq(instances.id, instance.id), eq(instances.state, "suspended")),
      )
      .returning({ id: instances.id });
    if (!resumedInstance) {
      throw new AppError("Instance is no longer suspended", 409);
    }

    await tx
      .update(instanceSlots)
      .set({ status: "active", updated_at: resumedAt })
      .where(eq(instanceSlots.id, reservedSlot.id));

    const [suspendedPeriod] = await tx
      .select({ id: instancePeriods.id })
      .from(instancePeriods)
      .where(
        and(
          eq(instancePeriods.instance_id, instance.id),
          eq(instancePeriods.kind, "suspended"),
          isNull(instancePeriods.ended_at),
        ),
      )
      .for("update");
    if (suspendedPeriod) {
      await chargeInstancePeriod({
        tx,
        periodId: suspendedPeriod.id,
        instance,
        endedAt: resumedAt,
        storageAmount: 0,
        event: "resumed",
      });
    }

    await openInstancePeriod({
      tx,
      instanceId: instance.id,
      kind: "running",
      startedAt: resumedAt,
      ratePerSecond: sandboxType.price_per_second,
    });
  });

  await addTerminateOrPauseInstanceJob({
    instanceId: instance.id,
    autoExpire: true,
  });

  // E2B traffic credentials and the proxy's instance access token may have
  // changed while suspended. Clear both layers before exposing the runtime.
  await invalidateCachedProxyPreviews("e2b", instance.provider_instance_id);
  if (instance.project_id) {
    await invalidateProjectProxiesByPid(
      instance.project_id,
      [`3101-${instance.id}`, `4096-${instance.id}`],
      instance.proxy_domain,
    );
  }

  await createOpenRouterVirtualKeyAndSave({
    instanceId: instance.id,
    limit_in_dollars: await getOpenRouterKeyLimitInDollars({
      userId,
      instanceTypeId: null,
      sandboxTypeId: sandboxType.id,
      autoTerminateAfterInMinutes,
    }),
    expires_after_in_minutes: autoTerminateAfterInMinutes,
  });

  const [resumedInstance] = await db
    .select({ config: instances.config })
    .from(instances)
    .where(eq(instances.id, instance.id));
  const config =
    resumedInstance?.config && typeof resumedInstance.config === "object"
      ? (resumedInstance.config as Record<string, unknown>)
      : {};
  const sessionToken =
    typeof config.sessionToken === "string" ? config.sessionToken : "";
  if (!sessionToken) {
    throw new AppError("The instance has no session token", 500);
  }

  try {
    await e2bClient.runCommand(
      instance.provider_instance_id,
      resumeInstanceScript(),
      {
        user: SANDBOX_USERNAME,
        envs: { VIBEONGO_SESSION_TOKEN: sessionToken },
        timeoutMs: RESUME_SCRIPT_TIMEOUT_MS,
      },
    );
  } catch (error) {
    console.error(`The resume script failed on instance ${instance.id}`, error);
    throw new AppError(
      "The instance was resumed but its runtime did not start. Suspend or terminate it and try again.",
      502,
    );
  }

  if (instance.project_id) {
    await db
      .update(projectDomainRouting)
      .set({ target_instance_id: instance.id })
      .where(eq(projectDomainRouting.project_id, instance.project_id));
    await invalidateProjectProxiesByPid(
      instance.project_id,
      [`3101-${instance.id}`, `4096-${instance.id}`],
      instance.proxy_domain,
    );
  }
};
