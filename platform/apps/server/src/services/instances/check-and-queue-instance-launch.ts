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
} from "@repo/db";
import { tierLimits } from "../../utils/constants.js";
import { AppError } from "../../lib/app-error.js";
import { spinUpAndSaveInstanceV2 } from "./spin-up-and-save-instance-v2.js";
import { InstanceAutoTerminateSetting } from "./get-user-instance-auto-terminate-minutes.js";
import { InstanceRuntime } from "../../providers/types.js";

// TODO:
// 1. checkAndLaunchInstance -> for manual ones
// 2. addTheLaunchInstanceToQueue -> for automated ones

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
  return db.transaction(async (tx) => {
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
      throw new AppError("You had reaced limit please upgrade or wait", 402);
    }
    return spinUpAndSaveInstanceV2({
      userId: user.id,
      projectId: session.projectId,
      sessionId,
      spinedUpBy,
      runtime,
    });
  });
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
