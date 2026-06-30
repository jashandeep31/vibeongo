import {
  accounts,
  and,
  db,
  eq,
  instanceRegions,
  instanceTypes,
  userLoginLogs,
  users,
  userSettings,
  userWallet,
} from "@repo/db";
import { projectConfigValidator, z } from "@repo/shared";
import { createProjectWithConfigAndUserIdService } from "../../services/project/create-project-service.js";
interface CreateUserInput {
  email: string;
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

const githubProvider: typeof accounts.$inferInsert.provider = "github";
const internalError = "Something went wrong on our side";

const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user;
};

const parseName = (name?: string) => {
  const [firstName = "unknown", ...remainingNameParts] =
    name?.trim().split(/\s+/).filter(Boolean) ?? [];

  return {
    firstName,
    lastName: remainingNameParts.join(" ") || undefined,
  };
};

const upsertGithubAccount = async (
  userId: string,
  token: string,
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
      status: "active",
      token,
      // TODO: remove  in the production on public release
      verified: false,
      last_login_at: now,
    })
    .returning();

  if (!account) throw new Error(internalError);
  return account;
};

const ensureUserWallet = async (userId: string) => {
  await db
    .insert(userWallet)
    .values({
      user_id: userId,
      balance: 0,
    })
    .onConflictDoNothing({ target: userWallet.user_id });
};

const createUserWithGithubAccount = async ({
  email,
  name,
  token,
  username,
}: CreateUserInput): Promise<UserWithAccount> => {
  const { firstName, lastName } = parseName(name);

  return db.transaction(async (tx) => {
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
        status: "active",
        token,
        // TODO: remove  in the production on public release
        verified: false,
        last_login_at: new Date(),
      })
      .returning();

    if (!account) throw new Error(internalError);

    await tx.insert(userSettings).values({ user_id: user.id });
    await tx.insert(userWallet).values({
      user_id: user.id,
      balance: 0,
    });

    try {
      await createProjectWithConfigAndUserIdService(demoProject, user.id);
    } catch {}
    return { user, account };
  });
};

export const createOrGetUser = async (
  input: CreateUserInput,
): Promise<UserWithAccount> => {
  const existingUser = await getUserByEmail(input.email);

  const ip = input.ip ? input.ip.toString() : "unknown";
  const user_agent = input.user_agent ? input.user_agent.toString() : "unknown";

  let userWithAccount: UserWithAccount;

  if (existingUser) {
    const [account] = await Promise.all([
      upsertGithubAccount(existingUser.id, input.token),
      ensureUserWallet(existingUser.id),
    ]);
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

  return userWithAccount;
};

const [region] = await db.select().from(instanceRegions).limit(1);
const [instanceType] = await db.select().from(instanceTypes).limit(1);

export const demoProject: z.infer<typeof projectConfigValidator> = {
  name: "demo-project",
  description: "Demo project configuration",
  regionId: region?.id || "",
  instanceTypeId: instanceType!.id,
  sshKeyIds: [],
  githubRepoIds: [],
  initialScript: "",
  finalScript: `git clone https://github.com/jashandeep31/zed-snippets
npm i`,
  devScript: `
npm run dev
  `,
  config: {
    ports: [
      {
        port: 22,
        protocol: "TCP",
      },
      {
        port: 3000,
        protocol: "TCP",
      },
    ],
    packages: [
      {
        name: "opencode",
        enabled: true,
        config: {
          auth_json: {},
          model: "default",
          requirePassword: false,
        },
      },
    ],
  },
};
