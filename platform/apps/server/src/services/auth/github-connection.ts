import {
  accounts,
  and,
  db,
  eq,
  sql,
  users,
  userPasswordCredentials,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";

export type GithubIdentity = {
  id: string;
  username: string;
  name?: string;
  email: string;
  token: string;
};

export async function connectGithubIdentity(
  userId: string,
  identity: GithubIdentity,
) {
  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      if (!user || user.status !== "active")
        throw new AppError("Account is unavailable", 403);
      const [linked] = await tx
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.user_id, userId), eq(accounts.provider, "github")),
        )
        .for("update");
      if (linked && linked.provider_account_id !== identity.id)
        throw new AppError(
          "A different GitHub account is already connected",
          409,
        );
      if (
        linked &&
        (linked.status !== "active" || !linked.verified || linked.deleted_at)
      )
        throw new AppError("GitHub connection is unavailable", 403);
      const [owner] = await tx
        .select({ userId: accounts.user_id })
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, "github"),
            eq(accounts.provider_account_id, identity.id),
          ),
        );
      if (owner && owner.userId !== userId)
        throw new AppError(
          "This GitHub account is connected to another user",
          409,
        );
      const [emailOwner] = await tx
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = lower(${identity.email})`);
      if (emailOwner && emailOwner.id !== userId)
        throw new AppError("The GitHub email belongs to another account", 409);
      const names = (identity.name?.trim() || identity.username).split(/\s+/);
      const now = new Date();
      const [updated] = await tx
        .update(users)
        .set({
          username: identity.username,
          email: identity.email,
          email_verified_at: now,
          first_name: names[0]!,
          last_name: names.slice(1).join(" ") || null,
          primary_login_method: "github",
          updated_at: now,
        })
        .where(eq(users.id, userId))
        .returning();
      const values = {
        provider_account_id: identity.id,
        provider_username: identity.username,
        token: identity.token,
        last_login_at: now,
        updated_at: now,
      };
      if (linked)
        await tx
          .update(accounts)
          .set(values)
          .where(
            and(eq(accounts.user_id, userId), eq(accounts.provider, "github")),
          );
      else
        await tx
          .insert(accounts)
          .values({
            ...values,
            user_id: userId,
            provider: "github",
            status: "active",
            verified: true,
          });
      await tx
        .update(userPasswordCredentials)
        .set({ revoked_at: now, updated_at: now })
        .where(eq(userPasswordCredentials.user_id, userId));
      return updated!;
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    let cause = error as { code?: string; cause?: unknown };
    while (cause?.cause) cause = cause.cause as typeof cause;
    if (cause?.code === "23505")
      throw new AppError(
        "These GitHub details already belong to another account",
        409,
      );
    // SQL errors can contain provider tokens in parameters.
    throw new AppError("Could not connect GitHub. Please try again", 500);
  }
}
