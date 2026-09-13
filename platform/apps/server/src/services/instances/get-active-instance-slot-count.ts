import {
  and,
  eq,
  inArray,
  instanceSlotCategory,
  instanceSlots,
  sql,
  type Transaction,
} from "@repo/db";

export const getActiveInstanceSlotCount = async ({
  tx,
  userId,
  category,
}: {
  tx: Transaction;
  userId: string;
  category: (typeof instanceSlotCategory.enumValues)[number];
}) => {
  const [result] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(instanceSlots)
    .where(
      and(
        eq(instanceSlots.user_id, userId),
        eq(instanceSlots.category, category),
        inArray(instanceSlots.status, ["active", "provisioning"]),
      ),
    );

  return result?.count ?? 0;
};
