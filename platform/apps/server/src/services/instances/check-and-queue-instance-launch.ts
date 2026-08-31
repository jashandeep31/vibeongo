import {
  and,
  asc,
  db,
  desc,
  eq,
  inArray,
  instanceSlots,
  projectSessions,
  users,
  instanceSlotInstanceCategory,
  projects,
} from "@repo/db";
import { tierLimits } from "../../utils/constants.js";
import { AppError } from "../../lib/app-error.js";
import { spinUpAndSaveInstanceV2 } from "./spin-up-and-save-instance-v2.js";
import { InstanceAutoTerminateSetting } from "./get-user-instance-auto-terminate-minutes.js";
import { InstanceRuntime } from "../../providers/types.js";
import { z } from "zod";
import { addToInstanceProvisioningQueue } from "../../jobs/instance-provisioning-queue.js";
import { assertUserCanAffordInstanceLaunch } from "./assert-user-can-afford-instance-launch.js";
import { getActiveInstanceSlotCount } from "./get-active-instance-slot-count.js";

interface CheckAndLaunchInstance {
  userId: string;
  sessionId: string;
  spinedUpBy: InstanceAutoTerminateSetting;
  runtime: InstanceRuntime;
  category: (typeof instanceSlotInstanceCategory.enumValues)[number];
}

type DispatchQueuedInstanceLaunchesInput = {
  userId: string;
  category: (typeof instanceSlotInstanceCategory.enumValues)[number];
};

class InstanceCapacityUnavailableError extends Error {}

export async function dispatchQueuedInstanceLaunches({
  userId,
  category,
}: DispatchQueuedInstanceLaunchesInput) {
  const slotIds = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for("update");

    if (!user) throw new AppError("user not found", 404);

    const activeSlotCount = await getActiveInstanceSlotCount({
      tx,
      userId: user.id,
      category,
    });

    const availableCapacity = tierLimits[user.tier][category] - activeSlotCount;
    if (availableCapacity <= 0) return [];

    const queuedSlots = await tx
      .select({ id: instanceSlots.id })
      .from(instanceSlots)
      .where(
        and(
          eq(instanceSlots.user_id, user.id),
          eq(instanceSlots.category, category),
          eq(instanceSlots.status, "queued"),
        ),
      )
      .orderBy(desc(instanceSlots.priority), asc(instanceSlots.created_at))
      .limit(availableCapacity);

    return queuedSlots.map((slot) => slot.id);
  });

  await Promise.all(slotIds.map(addToInstanceProvisioningQueue));
  return slotIds;
}

export async function scheduleAutomatedInstanceLaunch({
  userId,
  sessionId,
  spinedUpBy,
  runtime,
  category,
}: CheckAndLaunchInstance) {
  await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId));

    if (!user) throw new AppError("user not found", 404);
    const [session] = await tx
      .select({ projectId: projectSessions.project_id })
      .from(projectSessions)
      .where(
        and(
          eq(projectSessions.id, sessionId),
          eq(projectSessions.user_id, user.id),
        ),
      )
      .limit(1);

    if (!session) {
      throw new AppError("Project session not found", 404);
    }

    const [project] = await tx
      .select()
      .from(projects)
      .where(
        and(eq(projects.user_id, user.id), eq(projects.id, session.projectId)),
      );
    if (!project) throw new AppError("Project not found ", 404);

    const [slot] = await tx
      .insert(instanceSlots)
      .values({
        user_id: user.id,
        category,
        runtime_kind: runtime,
        assign_domains: true,
        session_id: sessionId,
        instance_type_id: project.instance_type_id,
        sandbox_type_id: project.sandbox_type_id,
        spined_up_by: spinedUpBy,
        status: "queued",
      })
      .returning({ id: instanceSlots.id });

    if (!slot) {
      throw new AppError("Failed to reserve an instance slot", 500);
    }
  });

  await dispatchQueuedInstanceLaunches({ userId, category });
}

export const checkAndLaunchInstance = async ({
  userId,
  sessionId,
  spinedUpBy,
  runtime,
  category,
}: CheckAndLaunchInstance) => {
  const { session, slot } = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for("update");

    if (!user) throw new AppError("user not found", 404);
    const [session] = await tx
      .select({ projectId: projectSessions.project_id })
      .from(projectSessions)
      .where(
        and(
          eq(projectSessions.id, sessionId),
          eq(projectSessions.user_id, user.id),
        ),
      )
      .limit(1);
    if (!session) {
      throw new AppError("Project session not found", 404);
    }

    const [project] = await tx
      .select()
      .from(projects)
      .where(
        and(eq(projects.user_id, user.id), eq(projects.id, session.projectId)),
      );
    if (!project) throw new AppError("Project not found ", 404);

    const [existingSlot] = await tx
      .select({ id: instanceSlots.id })
      .from(instanceSlots)
      .where(
        and(
          eq(instanceSlots.session_id, sessionId),
          inArray(instanceSlots.status, [
            "queued",
            "provisioning",
            "active",
            "terminating",
          ]),
        ),
      )
      .limit(1);

    if (existingSlot) {
      throw new AppError(
        "This session already has an instance running or starting.",
        409,
      );
    }

    await assertUserCanAffordInstanceLaunch({
      tx,
      userId: user.id,
      runtime,
      instanceTypeId: project.instance_type_id,
      sandboxTypeId: project.sandbox_type_id,
    });

    const activeSlotCount = await getActiveInstanceSlotCount({
      tx,
      userId: user.id,
      category,
    });
    if (activeSlotCount >= tierLimits[user.tier][category]) {
      throw new AppError(
        "Instance limit reached. Upgrade your plan or wait for a running session to stop.",
        402,
      );
    }
    const [slot] = await tx
      .insert(instanceSlots)
      .values({
        user_id: user.id,
        category,
        runtime_kind: runtime,
        assign_domains: true,
        session_id: sessionId,
        instance_type_id: project.instance_type_id,
        sandbox_type_id: project.sandbox_type_id,
        status: "provisioning",
        spined_up_by: spinedUpBy,
      })
      .returning({
        id: instanceSlots.id,
        category: instanceSlots.category,
      });

    if (!slot) {
      throw new AppError("Failed to reserve an instance slot", 500);
    }

    return {
      session,
      slot,
    };
  });

  try {
    const instance = await spinUpAndSaveInstanceV2({
      userId: userId,
      projectId: session.projectId,
      sessionId,
      spinedUpBy,
      runtime,
      category: slot.category,
    });

    await db
      .update(instanceSlots)
      .set({
        instance_id: instance.id,
        status: "active",
        updated_at: new Date(),
      })
      .where(eq(instanceSlots.id, slot.id));

    return instance;
  } catch (error) {
    await db
      .update(instanceSlots)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date(),
      })
      .where(eq(instanceSlots.id, slot.id));

    throw error;
  }
};

const spinUpInstanceFromSlot = async (slotId: string) => {
  const { project, slot, session, user } = await db.transaction(async (tx) => {
    const [slot] = await tx
      .select()
      .from(instanceSlots)
      .where(eq(instanceSlots.id, slotId));
    if (!slot) throw new AppError("Slot not found", 404);

    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, slot.user_id))
      .for("update");
    if (!user) throw new AppError("user not found", 404);

    await assertUserCanAffordInstanceLaunch({
      tx,
      userId: user.id,
      runtime: slot.runtime_kind,
      instanceTypeId: slot.instance_type_id,
      sandboxTypeId: slot.sandbox_type_id,
    });

    const [session] = await tx
      .select()
      .from(projectSessions)
      .where(eq(projectSessions.id, slot.session_id))
      .limit(1);
    if (!session) {
      throw new AppError("Project session not found", 404);
    }

    const [project] = await tx
      .select()
      .from(projects)
      .where(eq(projects.id, session.project_id));

    const activeSlotCount = await getActiveInstanceSlotCount({
      tx,
      userId: user.id,
      category: slot.category,
    });
    if (activeSlotCount >= tierLimits[user.tier][slot.category]) {
      throw new InstanceCapacityUnavailableError();
    }

    if (!project) throw new AppError("Project not found ", 404);
    const [updatedSlot] = await tx
      .update(instanceSlots)
      .set({
        status: "provisioning",
        error: null,
        updated_at: new Date(),
      })
      .where(eq(instanceSlots.id, slotId))
      .returning();

    if (!updatedSlot) throw new AppError("failed to update the state", 500);
    return { user, slot: updatedSlot, project, session };
  });

  const spinedUpBy = z
    .enum(["manual", "pr", "issue"])
    .default("manual")
    .parse(slot.spined_up_by);

  const instance = await spinUpAndSaveInstanceV2({
    userId: user.id,
    sessionId: session.id,
    projectId: project.id,
    spinedUpBy,
    category: slot.category,
    runtime: slot.runtime_kind,
  });

  await db
    .update(instanceSlots)
    .set({
      instance_id: instance.id,
      status: "active",
      error: null,
      updated_at: new Date(),
    })
    .where(eq(instanceSlots.id, slotId));

  return instance;
};

export async function SpinUpInstanceFromSlot(slotId: string) {
  try {
    return await spinUpInstanceFromSlot(slotId);
  } catch (error) {
    if (error instanceof InstanceCapacityUnavailableError) return;

    await db
      .update(instanceSlots)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date(),
      })
      .where(eq(instanceSlots.id, slotId));

    return;
  }
}
