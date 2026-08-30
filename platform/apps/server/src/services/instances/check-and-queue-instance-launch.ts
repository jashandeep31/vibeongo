import {
  and,
  db,
  eq,
  instanceSlots,
  projectSessions,
  users,
  inArray,
  userTier,
  instanceSlotInstanceCategory,
  projects,
} from "@repo/db";
import { tierLimits } from "../../utils/constants.js";
import { AppError } from "../../lib/app-error.js";
import { spinUpAndSaveInstanceV2 } from "./spin-up-and-save-instance-v2.js";
import { InstanceAutoTerminateSetting } from "./get-user-instance-auto-terminate-minutes.js";
import { InstanceRuntime } from "../../providers/types.js";

interface CheckAndLaunchInstance {
  user: typeof users.$inferSelect;
  sessionId: string;
  spinedUpBy: InstanceAutoTerminateSetting;
  runtime: InstanceRuntime;
}
export const checkAndLaunchInstance = async ({
  user,
  sessionId,
  spinedUpBy,
  runtime,
}: CheckAndLaunchInstance) => {
  const { session, slotId } = await db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, user.id))
      .for("update");

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

    // get the instanceSlots those are already running or getting ready to run
    const activeOrQueuedInstances = await tx
      .select()
      .from(instanceSlots)
      .where(
        and(
          eq(instanceSlots.user_id, user.id),
          inArray(instanceSlots.status, ["active", "provisioning"]),
        ),
      );

    const eligibilty = checkUserEligibilityAccTier(
      user.tier,
      activeOrQueuedInstances,
      "manual",
    );
    if (!eligibilty.eligible) {
      throw new AppError(
        "Instance limit reached. Upgrade your plan or wait for a running session to stop.",
        402,
      );
    }
    const [slot] = await tx
      .insert(instanceSlots)
      .values({
        user_id: user.id,
        category: "manual",
        runtime_kind: runtime,
        assign_domains: true,
        session_id: sessionId,
        instance_type_id: project.instance_type_id,
        sandbox_type_id: project.sandbox_type_id,
        status: "provisioning",
      })
      .returning({ id: instanceSlots.id });

    if (!slot) {
      throw new AppError("Failed to reserve an instance slot", 500);
    }

    return {
      session,
      slotId: slot.id,
    };
  });

  try {
    const instance = await spinUpAndSaveInstanceV2({
      userId: user.id,
      projectId: session.projectId,
      sessionId,
      spinedUpBy,
      runtime,
    });

    await db
      .update(instanceSlots)
      .set({
        instance_id: instance.id,
        status: "active",
        updated_at: new Date(),
      })
      .where(eq(instanceSlots.id, slotId));

    return instance;
  } catch (error) {
    await db
      .update(instanceSlots)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date(),
      })
      .where(eq(instanceSlots.id, slotId));

    throw error;
  }
};

function checkUserEligibilityAccTier(
  tier: (typeof userTier.enumValues)[number],
  slots: (typeof instanceSlots.$inferSelect)[],
  currentCategory: (typeof instanceSlotInstanceCategory.enumValues)[number],
): {
  eligible: boolean;
  queueForFuture: boolean;
} {
  const limit = tierLimits[tier]?.[currentCategory];

  if (limit === undefined) {
    return {
      eligible: false,
      queueForFuture: false,
    };
  }

  const currentCount = slots.filter(
    (slot) => slot.category === currentCategory,
  ).length;
  const eligible = currentCount < limit;

  return {
    eligible,
    queueForFuture:
      eligible === false && currentCategory === "auto" ? true : false,
  };
}
