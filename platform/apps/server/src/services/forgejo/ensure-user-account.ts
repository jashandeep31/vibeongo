import { db, eq, users } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { ensureForgejoUserAccount } from "./user-actions.js";

// Provision on first project creation, including for email/password users.
export async function ensureUserForgejoAccount(
  userId: string,
): Promise<number> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user || user.status !== "active")
      throw new AppError("Account is unavailable", 403);
    if (user.forgejo_id !== null) return user.forgejo_id;
    const account = await ensureForgejoUserAccount(user);
    await tx
      .update(users)
      .set({ forgejo_id: account.id, updated_at: new Date() })
      .where(eq(users.id, user.id));
    return account.id;
  });
}
