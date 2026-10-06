import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { runInstanceActionWithLock } from "../../services/instances/instance-lifecycle.js";
import { addTerminateOrPauseInstanceJob } from "../../jobs/terminate-or-pause-instance.js";
import { AppError } from "../../lib/app-error.js";

export const terminateSessionInstance = catchAsync(
  async (req: Request, res: Response) => {
    const runtimeInstance = req.runtimeInstance;
    if (!runtimeInstance) throw new AppError("Instance not found", 404);

    const { id, instanceId } = z
      .object({ id: z.string(), instanceId: z.string() })
      .parse(req.params);

    if (
      runtimeInstance.id !== instanceId ||
      runtimeInstance.project_session_id !== id
    ) {
      throw new AppError("Instance not found", 404);
    }

    const lock = await runInstanceActionWithLock({
      instanceId,
      userId: runtimeInstance.user_id,
      action: "terminate",
    });

    if (!lock.acquired) {
      await addTerminateOrPauseInstanceJob({
        instanceId,
        action: "terminate",
        delayInMinutes: 1,
      });
      res.status(202).json({
        data: "Your termination request is being processed. It will be processed in the next few minutes.",
      });
      return;
    }

    res.status(200).json({ data: "Instance terminated" });
  },
);
