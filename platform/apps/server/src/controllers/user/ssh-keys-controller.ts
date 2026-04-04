import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { z } from "zod";
import { db, eq, and, sshKeys } from "@repo/db";
import { createSshKeySchema } from "@repo/shared";

export const createSshKey = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);
  const parsedData = createSshKeySchema.parse(req.body);

  await db.insert(sshKeys).values({
    name: parsedData.name,
    value: parsedData.value,
    user_id: user.id,
  });

  res.status(201).json({
    message: "SSH  key is added successfully",
  });
  return;
});

export const getSshKeys = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);
  const sshKeysRes = await db
    .select()
    .from(sshKeys)
    .where(eq(sshKeys.user_id, user.id));

  res.status(200).json({
    data: sshKeysRes,
  });
});

export const deleteSshKey = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const id = req.params.id;
  if (!id || typeof id !== "string")
    throw new AppError("SSH Key ID is required", 400);

  const result = await db
    .delete(sshKeys)
    .where(and(eq(sshKeys.id, id), eq(sshKeys.user_id, user.id)))
    .returning();

  if (result.length === 0) {
    throw new AppError("SSH key not found or unauthorized", 404);
  }

  res.status(200).json({
    message: "SSH key deleted successfully",
  });
});
