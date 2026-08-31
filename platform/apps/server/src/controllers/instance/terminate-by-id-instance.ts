import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { terminateInstanceAndChargeUsage } from "../../services/instances/terminate-instance-and-charge-usage.js";

export const terminateByIdInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const id = req.params.id;
    if (id === undefined || typeof id !== "string")
      throw new AppError("id is required", 400);

    if (!user) throw new AppError("authentication is required", 400);

    await terminateInstanceAndChargeUsage({
      instanceId: id,
      userId: user.id,
    });

    res.status(200).json({
      message: "Instance terminated successfully",
    });
  },
);
