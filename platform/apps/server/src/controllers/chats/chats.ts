import { and, desc, chats, db, eq } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";

const chatIdSchema = z.object({
  id: z.string(),
});

const renameChatSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(30),
});

export const getUserChats = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const chatRows = await db
    .select()
    .from(chats)
    .where(eq(chats.user_id, user.id))
    .orderBy(desc(chats.updated_at));

  res.status(200).json({
    data: {
      chats: chatRows,
    },
  });
});

export const renameChat = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const { id, name } = renameChatSchema.parse({
    ...req.params,
    ...req.body,
  });

  const [updatedChat] = await db
    .update(chats)
    .set({
      name,
      updated_at: new Date(),
    })
    .where(and(eq(chats.id, id), eq(chats.user_id, user.id)))
    .returning();

  if (!updatedChat) {
    throw new AppError("Chat not found or unauthorized", 404);
  }

  res.status(200).json({
    message: "Chat renamed successfully",
    data: updatedChat,
  });
});

export const deleteChat = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const { id } = chatIdSchema.parse(req.params);

  const [deletedChat] = await db
    .delete(chats)
    .where(and(eq(chats.id, id), eq(chats.user_id, user.id)))
    .returning();

  if (!deletedChat) {
    throw new AppError("Chat not found or unauthorized", 404);
  }

  res.status(200).json({
    message: "Chat deleted successfully",
    data: deletedChat,
  });
});
