import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { terminateInstanceAndChargeUsageWithInstanceIdAndSessionId } from "../../services/instances/terminate-instance-and-charge-usage.js";
import { AppError } from "../../lib/app-error.js";

export const suspendSessionInstance = catchAsync(
  async (req: Request, res: Response) => {
    const runtimeInstance = req.runtimeInstance;
    if (!runtimeInstance) throw new AppError("Instance not found", 404);

    const { id, instanceId } = z
      .object({ id: z.string(), instanceId: z.string() })
      .parse(req.params);

    await terminateInstanceAndChargeUsageWithInstanceIdAndSessionId({
      instanceId: instanceId,
      sessionId: id,
    });
    res.status(200).json({ data: "Instance suspended" });
  },
);
