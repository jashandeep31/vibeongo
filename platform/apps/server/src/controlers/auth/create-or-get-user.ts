import { accounts, db, eq, users } from "@repo/db";

interface CreateUser {
  email: string;
  name?: string | undefined;
  avatar?: string | undefined;
  password?: string | undefined;
  provider: ["google"][number];
}
export const createOrGetUser = async ({
  email,
  name,
}: CreateUser): Promise<typeof users.$inferSelect> => {
  const [isUser] = await db.select().from(users).where(eq(users.email, email));

  if (isUser) {
    return isUser;
  }

  const firstName = name?.split(" ")[0];
  const lastName = name?.split(" ")?.slice(1)?.join(" ");
  const user = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: email,
        first_name: firstName ? firstName : "unkown",
        last_name: lastName,
      })
      .returning();
    if (!user) throw new Error("Something went wrong on our side");
    await tx.insert(accounts).values({
      user_id: user.id,
      provider: "google",
      status: "active",
      last_login_at: new Date(),
    });
    return user;
  });

  return user;
};
