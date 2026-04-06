import { accounts, and, db, eq, users } from "@repo/db";

interface CreateUser {
  email: string;
  name?: string | undefined;
  token: string;
  username: string;
}

const provider: typeof accounts.$inferInsert.provider = "github";
const internalError = "Something went wrong on our side";

const ensureId = (id: string | null | undefined) => {
  if (!id) throw new Error(internalError);
  return id;
};

const upsertGithubAccount = async (userId: string, token: string) => {
  const [existingAccount] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.user_id, userId), eq(accounts.provider, provider)));

  const now = new Date();

  if (existingAccount?.id) {
    await db
      .update(accounts)
      .set({
        status: "active",
        token,
        last_login_at: now,
        updated_at: now,
      })
      .where(eq(accounts.id, existingAccount.id));
    return;
  }

  await db.insert(accounts).values({
    user_id: userId,
    provider,
    status: "active",
    token,
    last_login_at: now,
  });
};

export const createOrGetUser = async ({
  email,
  name,
  token,
  username,
}: CreateUser): Promise<typeof users.$inferSelect> => {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existingUser) {
    await upsertGithubAccount(ensureId(existingUser.id), token);
    return existingUser;
  }

  const nameParts = name?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0] || "unknown";
  const lastName = nameParts.slice(1).join(" ") || undefined;

  const user = await db.transaction(async (tx) => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        email,
        first_name: firstName,
        last_name: lastName,
        username,
      })
      .returning();
    if (!createdUser) throw new Error(internalError);

    await tx.insert(accounts).values({
      user_id: ensureId(createdUser.id),
      provider,
      status: "active",
      token,
      last_login_at: new Date(),
    });

    return createdUser;
  });

  return user;
};
