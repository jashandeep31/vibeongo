import {
  accounts,
  and,
  db,
  eq,
  userLoginLogs,
  users,
  userSettings,
  userWallet,
} from "@repo/db";
interface CreateUserInput {
  email: string;
  providerAccountId: string;
  name?: string | undefined;
  token: string;
  username: string;
  ip: string | string[] | undefined;
  user_agent: string | string[] | undefined;
}

type User = typeof users.$inferSelect;
type Account = typeof accounts.$inferSelect;

interface UserWithAccount {
  user: User;
  account: Account;
}

interface CreateOrGetUserResult extends UserWithAccount {
  isNewUser: boolean;
}

const githubProvider: typeof accounts.$inferInsert.provider = "github";
const internalError = "Something went wrong on our side";

const getUserByGithubAccountId = async (
  providerAccountId: string,
): Promise<User | undefined> => {
  const [result] = await db
    .select({ user: users })
    .from(accounts)
    .innerJoin(users, eq(accounts.user_id, users.id))
    .where(
      and(
        eq(accounts.provider, githubProvider),
        eq(accounts.provider_account_id, providerAccountId),
      ),
    )
    .limit(1);

  return result?.user;
};

const isKnownValue = (value?: string): value is string =>
  Boolean(value?.trim()) && value?.trim().toLowerCase() !== "unknown";

const parseName = (name: string | undefined, username: string, email: string) => {
  const nameParts = isKnownValue(name)
    ? name.trim().split(/\s+/)
    : [];
  const [firstName, ...remainingNameParts] = nameParts;
  const emailName = email.split("@")[0]?.trim();

  return {
    firstName:
      firstName ??
      (isKnownValue(username) ? username.trim() : undefined) ??
      (isKnownValue(emailName) ? emailName : "unknown"),
    lastName: remainingNameParts.join(" ") || undefined,
  };
};

const upsertGithubAccount = async (
  userId: string,
  token: string,
  providerAccountId: string,
): Promise<Account> => {
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.user_id, userId), eq(accounts.provider, githubProvider)),
    )
    .limit(1);

  const now = new Date();

  if (existingAccount) {
    const [updatedAccount] = await db
      .update(accounts)
      .set({
        status: "active",
        token,
        provider_account_id: providerAccountId,
        last_login_at: now,
        updated_at: now,
      })
      .where(
        and(
          eq(accounts.user_id, userId),
          eq(accounts.provider, githubProvider),
        ),
      )
      .returning();

    if (!updatedAccount) throw new Error(internalError);
    return updatedAccount;
  }

  const [account] = await db
    .insert(accounts)
    .values({
      user_id: userId,
      provider: githubProvider,
      provider_account_id: providerAccountId,
      status: "active",
      token,
      verified: true,
      last_login_at: now,
    })
    .returning();

  if (!account) throw new Error(internalError);
  return account;
};

const createUserWithGithubAccount = async ({
  email,
  name,
  token,
  providerAccountId,
  username,
}: CreateUserInput): Promise<UserWithAccount> => {
  const { firstName, lastName } = parseName(name, username, email);

  const userWithAccount = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email,
        first_name: firstName,
        last_name: lastName,
        username,
      })
      .returning();

    if (!user) throw new Error(internalError);

    const [account] = await tx
      .insert(accounts)
      .values({
        user_id: user.id,
        provider: githubProvider,
        provider_account_id: providerAccountId,
        status: "active",
        token,
        verified: true,
        last_login_at: new Date(),
      })
      .returning();

    if (!account) throw new Error(internalError);

    await tx.insert(userSettings).values({ user_id: user.id });
    await tx.insert(userWallet).values({
      user_id: user.id,
      balance: 0,
    });

    return { user, account };
  });

  return userWithAccount;
};

export const createOrGetUser = async (
  input: CreateUserInput,
): Promise<CreateOrGetUserResult> => {
  const existingUser = await getUserByGithubAccountId(
    input.providerAccountId,
  );
  const isNewUser = !existingUser;

  const ip = input.ip ? input.ip.toString() : "unknown";
  const user_agent = input.user_agent ? input.user_agent.toString() : "unknown";

  let userWithAccount: UserWithAccount;

  if (existingUser) {
    const account = await upsertGithubAccount(
      existingUser.id,
      input.token,
      input.providerAccountId,
    );
    userWithAccount = {
      user: existingUser,
      account,
    };
  } else {
    userWithAccount = await createUserWithGithubAccount(input);
  }

  await db.insert(userLoginLogs).values({
    user_id: userWithAccount.user.id,
    ip_address: ip,
    user_agent,
  });

  return { ...userWithAccount, isNewUser };
};
