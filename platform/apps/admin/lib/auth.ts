import { db, eq, users } from "@repo/db";
import { betterAuth } from "better-auth";

export const ADMIN_EMAIL = "jashandeep1659@gmail.com";

export const isAdminEmail = (email?: string | null) =>
  email?.toLowerCase().trim() === ADMIN_EMAIL;

export const auth = betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    session: {
      create: {
        async before(session, ctx) {
          if (!ctx) return;

          const user = await ctx.context.internalAdapter.findUserById(
            session.userId,
          );

          if (!user || !user.email) return;

          const [userRow] = await db
            .select()
            .from(users)
            .where(eq(users.email, user?.email));

          if (userRow.role !== "admin") {
            return;
          }

          return { data: { ...session, role: userRow.role } };
        },
      },
    },
  },
});
