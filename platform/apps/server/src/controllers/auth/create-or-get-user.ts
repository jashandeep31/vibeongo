import { accounts, and, db, eq, users, userWallet } from "@repo/db";

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
    const userwalletRow = await db
      .select()
      .from(userWallet)
      .where(eq(userWallet.user_id, existingUser.id));

    if (!userwalletRow) {
      await db.insert(userWallet).values({
        user_id: existingUser.id,
        balance: 0,
      });
    }
    return existingUser;
  }

  const nameParts = name?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0] || "unknown";
  const lastName = nameParts.slice(1).join(" ") || undefined;

  const user = await db.transaction(async (tx) => {
    const [dbUser] = await tx
      .insert(users)
      .values({
        email,
        first_name: firstName,
        last_name: lastName,
        username,
      })
      .returning();
    if (!dbUser) throw new Error(internalError);

    // create account for user
    await tx.insert(accounts).values({
      user_id: ensureId(dbUser.id),
      provider,
      status: "active",
      token,
      last_login_at: new Date(),
    });

    // creating the  user wallet
    await tx.insert(userWallet).values({
      user_id: dbUser.id,
      balance: 0,
    });

    return dbUser;
  });

  return user;
};
