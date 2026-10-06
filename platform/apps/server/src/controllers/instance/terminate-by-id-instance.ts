import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { runInstanceActionWithLock } from "../../services/instances/instance-lifecycle.js";
import { addTerminateOrPauseInstanceJob } from "../../jobs/terminate-or-pause-instance.js";

export const terminateByIdInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const id = req.params.id;
    if (id === undefined || typeof id !== "string")
      throw new AppError("id is required", 400);

    if (!user) throw new AppError("authentication is required", 400);

    const lock = await runInstanceActionWithLock({
      instanceId: id,
      userId: user.id,
      action: "terminate",
    });

    if (!lock.acquired) {
      await addTerminateOrPauseInstanceJob({
        instanceId: id,
        action: "terminate",
        delayInMinutes: 1,
      });

      res.status(202).json({
        message:
          "Your termination request is being processed. It will be processed in the next few minutes.",
      });
      return;
    }

    res.status(200).json({
      message: "Instance terminated successfully",
    });
  },
);
