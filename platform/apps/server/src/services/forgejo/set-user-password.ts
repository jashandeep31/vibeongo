import { users } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import {
  ensureForgejoUserAccount,
  forgejoAPIClient,
  type ForgejoUser,
} from "./user-actions.js";

export async function setForgejoUserPassword(
  user: typeof users.$inferSelect,
  password: string,
): Promise<ForgejoUser> {
  if (password.length < 4 || password.length > 20) {
    throw new AppError("Password must be between 4 and 20 characters", 400);
  }

  const forgejoUser = await ensureForgejoUserAccount(user);
  const response = await forgejoAPIClient.patch<ForgejoUser>(
    `/admin/users/${encodeURIComponent(forgejoUser.username)}`,
    {
      password,
      must_change_password: false,
    },
  );

  return response.data;
}
