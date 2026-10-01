import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { runInstanceActionWithLock } from "../../services/instances/instance-lifecycle.js";
import { addTerminateOrPauseInstanceJob } from "../../jobs/terminate-or-pause-instance.js";

export const suspendByIdInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { id } = z.object({ id: z.uuid() }).parse(req.params);

    const lock = await runInstanceActionWithLock({
      instanceId: id,
      userId: user.id,
      action: "pause",
    });

    if (!lock.acquired) {
      await addTerminateOrPauseInstanceJob({
        instanceId: id,
        action: "pause",
        delayInMinutes: 1,
      });
      res.status(202).json({
        message:
          "Your pause request is being processed. It will be processed in the next few minutes.",
      });
      return;
    }

    res.status(200).json({
      message: "Instance suspended successfully",
    });
  },
);
