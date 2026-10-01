import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { and, db, eq, instances } from "@repo/db";
import { runInstanceActionWithLock } from "../../services/instances/instance-lifecycle.js";
import { addTerminateOrPauseInstanceJob } from "../../jobs/terminate-or-pause-instance.js";

export const resumeSuspendedProjectSession = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { id } = z.object({ id: z.uuid() }).parse(req.params);

    const [instance] = await db
      .select({ id: instances.id })
      .from(instances)
      .where(
        and(
          eq(instances.project_session_id, id),
          eq(instances.user_id, user.id),
          eq(instances.state, "suspended"),
        ),
      );
    if (!instance) {
      throw new AppError("This session has no suspended instance", 404);
    }

    const lock = await runInstanceActionWithLock({
      instanceId: instance.id,
      userId: user.id,
      action: "resume",
    });
    if (!lock.acquired) {
      await addTerminateOrPauseInstanceJob({
        instanceId: instance.id,
        action: "resume",
        delayInMinutes: 1,
      });
      res.status(202).json({
        message:
          "Your resume request is being processed. It will be processed in the next few minutes.",
      });
      return;
    }

    res.status(200).json({ message: "Session resumed successfully" });
  },
);
