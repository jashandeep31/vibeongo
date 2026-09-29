import { and, db, eq, pushTokens } from "@repo/db";
import { z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

// called by the mobile app on launch / foreground to register or refresh
// the device token and its os notification permission
export const upsertPushToken = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  const { token, platform, enabled } = z
    .object({
      token: z.string().min(1).max(255),
      platform: z.enum(["ios", "android"]),
      enabled: z.boolean(),
    })
    .parse(req.body);

  const now = new Date();
  const [pushToken] = await db
    .insert(pushTokens)
    .values({
      user_id: user.id,
      token,
      platform,
      enabled,
      last_seen_at: now,
    })
    // same device: move it to the current user and refresh its state
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: {
        user_id: user.id,
        platform,
        enabled,
        last_seen_at: now,
        updated_at: now,
      },
    })
    .returning();

  if (!pushToken) throw new AppError("Failed to save push token", 500);

  res.status(200).json({
    message: "Push token saved",
    data: pushToken,
  });
});

// called by the mobile app on sign out so the device stops receiving
// this user's push notifications
export const deletePushToken = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  const { token } = z
    .object({ token: z.string().min(1).max(255) })
    .parse(req.body);

  // only delete if the token still belongs to this user
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.token, token), eq(pushTokens.user_id, user.id)));

  res.status(200).json({ message: "Push token deleted" });
});
