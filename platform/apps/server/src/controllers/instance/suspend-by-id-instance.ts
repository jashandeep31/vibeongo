import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { suspendInstanceAndRevokeAccess } from "../../services/instances/suspend-instance-and-revoke-access.js";

export const suspendByIdInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { id } = z.object({ id: z.uuid() }).parse(req.params);

    await suspendInstanceAndRevokeAccess({
      instanceId: id,
      userId: user.id,
    });

    res.status(200).json({
      message: "Instance suspended successfully",
    });
  },
);
