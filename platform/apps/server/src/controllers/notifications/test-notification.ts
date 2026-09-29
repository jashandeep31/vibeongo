import { z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { createNotification } from "../../services/notifications/create-notification.js";

// TODO: temporary route to test notifications, remove before release
export const createTestNotification = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  // seconds before falling back to a push notification
  const { delay } = z
    .object({ delay: z.coerce.number().int().min(0).max(3600).default(10) })
    .parse(req.query);

  const notification = await createNotification({
    userId: user.id,
    type: "test",
    title: "Test notification",
    body: `Sent at ${new Date().toLocaleTimeString()}, push after ${delay}s if unread`,
    pushDelayMs: delay * 1000,
  });

  res.status(201).json({
    message: "Test notification created",
    data: notification,
  });
});
