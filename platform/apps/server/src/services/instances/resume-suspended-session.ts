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
import { PAUSEABLE_SANDBOX_PROVIDERS } from "../../providers/constants.js";
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
import { lockNames, withRedisLock } from "../../cache/redis-lock.js";
import { BoatClient } from "../../providers/client/boat-client.js";
import { addSandboxSetupJob } from "../../jobs/sandbox-setup.js";

const e2bClient = new E2BClient();
const boatClient = new BoatClient();

interface ResumeSuspendedSessionProps {
  sessionId: string;
  userId: string;
}

export const resumeSuspendedSession = async ({
  sessionId,
  userId,
}: ResumeSuspendedSessionProps) => {
  // Resolve ownership before taking the same lock used by pause and termination.
  const [instance] = await db
    .select({ id: instances.id })
    .from(instances)
    .where(
      and(
        eq(instances.project_session_id, sessionId),
        eq(instances.user_id, userId),
        eq(instances.state, "suspended"),
      ),
    );
  if (!instance) {
    throw new AppError("This session has no suspended instance", 404);
  }

  // Resume the instance with the locking system
  // to prevent multiple concurrent requests.
  const lock = await withRedisLock(
    lockNames.instanceLifecycle(instance.id),
    () =>
      resumeSuspendedSessionUnderLock({
        instanceId: instance.id,
        sessionId,
        userId,
      }),
  );
  if (!lock.acquired) {
    throw new AppError(
      "Another operation is in progress for this instance. Please try again shortly.",
      409,
    );
  }
};

const resumeSuspendedSessionUnderLock = async ({
  instanceId,
  sessionId,
  userId,
}: ResumeSuspendedSessionProps & { instanceId: string }) => {
  const [row] = await db
    .select({ instance: instances, sandboxType: sandboxTypes })
    .from(instances)
    .innerJoin(sandboxTypes, eq(sandboxTypes.id, instances.sandbox_type_id))
    .where(
      and(
        eq(instances.id, instanceId),
        eq(instances.project_session_id, sessionId),
        eq(instances.user_id, userId),
        eq(instances.state, "suspended"),
      ),
    );

  if (!row) {
    throw new AppError("This session has no suspended instance", 404);
  }
  const { instance, sandboxType } = row;
  const provider = sandboxType.provider;
  if (provider !== "e2b" && provider !== "boat") {
    throw new AppError(
      `Only ${PAUSEABLE_SANDBOX_PROVIDERS.join(", ")} sandboxes can be resumed`,
      400,
    );
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

  let autoTerminateAfterInMinutes: number;
  try {
    autoTerminateAfterInMinutes = await getValidatedAutoTerminateAfterInMinutes(
      {
        runtime: "sandbox",
        terminateAfterInMinutes: undefined,
        userId,
        terminateSetting: z
          .enum(["manual", "pr", "issue", "automation"])
          .catch("manual")
          .parse(reservedSlot.spun_up_by),
      },
    );

    let resumed: boolean = false;
    switch (provider) {
      case "e2b":
        resumed = await e2bClient.resumeInstance(
          instance.provider_instance_id,
          autoTerminateAfterInMinutes * 60 * 1000,
        );
        break;
      case "boat":
        resumed = await boatClient.resumeInstance(
          instance.provider_instance_id,
          autoTerminateAfterInMinutes * 60 * 1000,
        );
        break;
      default:
        throw new AppError("Unknown sandbox provider", 500);
    }

    if (!resumed) {
      throw new AppError(
        "Could not resume the instance. Please try again.",
        502,
      );
    }
  } catch (error) {
    await db
      .update(instanceSlots)
      .set({ status: "suspended", updated_at: new Date() })
      .where(
        and(
          eq(instanceSlots.id, reservedSlot.id),
          eq(instanceSlots.status, "provisioning"),
        ),
      );
    throw error;
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

  // Preview credentials and the instance access token may have changed.
  await invalidateCachedProxyPreviews(provider, instance.provider_instance_id);
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
    await addSandboxSetupJob({
      provider,
      sandboxId: instance.provider_instance_id,
      scriptType: "resume",
      userData: resumeInstanceScript({
        authToken: sessionToken,
        projectSessionId: sessionId,
        instanceId: instance.id,
        instanceName: instance.name,
      }),
    });
  } catch (error) {
    console.error(
      `Could not queue the resume script for instance ${instance.id}`,
      error,
    );
    throw new AppError(
      "The instance was resumed but its runtime restart could not be queued. Suspend or terminate it and try again.",
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
