import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { addToInstanceTerminationQueue } from "../../jobs/instance-termination.js";

export const terminateByIdInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const id = req.params.id;
    if (id === undefined || typeof id !== "string")
      throw new AppError("id is required", 400);

    if (!user) throw new AppError("authentication is required", 400);

    await addToInstanceTerminationQueue({
      instanceId: id,
      userId: user.id,
    });

    res.status(202).json({
      message: "Instance termination queued successfully",
    });
  },
);
