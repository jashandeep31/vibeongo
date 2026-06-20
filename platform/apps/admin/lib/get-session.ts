import { headers } from "next/headers";
import { auth } from "./auth";
import { db, eq, users } from "@repo/db";
import { redirect } from "next/navigation";

export const getSession = async () =>
  await auth.api.getSession({
    headers: await headers(),
  });

export const checkAdmin = async (): Promise<boolean> => {
  const session = await getSession();
  if (!session?.user.email) {
    return redirect("/not-found");
  }
  const email = session.user.email;
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || user.role !== "admin") {
    return redirect("/not-found");
  }
  return true;
};
