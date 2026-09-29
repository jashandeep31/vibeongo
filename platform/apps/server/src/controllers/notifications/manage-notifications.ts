import { and, db, desc, eq, isNull, notifications } from "@repo/db";
import { commonFilterSchema, z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

export const getNotifications = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  const { page, limit } = commonFilterSchema.parse(req.query);
  const { unread } = z
    .object({ unread: z.enum(["true", "false"]).optional() })
    .parse(req.query);

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.user_id, user.id),
        unread === "true" ? isNull(notifications.read_at) : undefined,
      ),
    )
    .orderBy(desc(notifications.created_at))
    .limit(limit + 1)
    .offset((page - 1) * limit);

  res.status(200).json({
    data: {
      notifications: rows.slice(0, limit),
      has_next: rows.length > limit,
      page,
    },
  });
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  const { id } = z.object({ id: z.uuid() }).parse(req.params);

  const [notification] = await db
    .update(notifications)
    .set({
      status: "read",
      read_at: new Date(),
      updated_at: new Date(),
    })
    .where(and(eq(notifications.id, id), eq(notifications.user_id, user.id)))
    .returning();

  if (!notification) throw new AppError("Notification not found", 404);

  res.status(200).json({
    message: "Notification marked as read",
    data: notification,
  });
});
