import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { z } from "zod";
import { db, eq, sshKeys } from "@repo/db";
import { createSshKeySchema } from "@repo/shared";

export const createSshKey = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);
  const parsedData = createSshKeySchema.parse(req.body);

  await db.insert(sshKeys).values({
    name: parsedData.name,
    value: parsedData.value,
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
    .where(eq(sshKeys.id, user.id));

  res.status(200).json({
    data: sshKeysRes,
  });
});
