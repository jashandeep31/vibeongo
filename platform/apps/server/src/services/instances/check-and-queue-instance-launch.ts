import {
  and,
  db,
  eq,
  instanceSlots,
  users,
  inArray,
  userTier,
  instanceSlotInstaceCategory,
} from "@repo/db";
import { includes } from "zod";
import { tierLimits } from "../../utils/constants.js";
import { AppError } from "../../lib/app-error.js";

export const checkAndQueueInstanceLaunch = async () => {
  await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, ""))
      .for("update");
    if (!user) throw new AppError("User not found", 404);

    const activeOrQueuedInstances = await tx
      .select()
      .from(instanceSlots)
      .where(
        and(
          eq(instanceSlots.user_id, ""),
          inArray(instanceSlots.status, ["active", "queued"]),
        ),
      );

    const eligibilty = checkUserEligibilityAccTier(
      user?.tier,
      activeOrQueuedInstances,
      "auto",
    );

    if (eligibilty.eligible === true) {
      // run spin up and save
      //
      // and update the status to active
    } else if ((eligibilty.eligible === false, eligibilty.queueForFuture)) {
      // queue for future
    } else {
      // throw the error of limit reach
    }
  });
};

function checkUserEligibilityAccTier(
  tier: (typeof userTier.enumValues)[number],
  slots: (typeof instanceSlots.$inferSelect)[],
  currentCategory: (typeof instanceSlotInstaceCategory.enumValues)[number],
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
