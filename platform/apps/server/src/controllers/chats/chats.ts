import { chats, db, eq } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";

export const getUserChats = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const chatRows = await db
    .select()
    .from(chats)
    .where(eq(chats.user_id, user.id));

  res.status(200).json({
    data: {
      chats: chatRows,
    },
  });
});
