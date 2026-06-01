import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { terminateInstanceAndChargeUsageWithInstanceIdAndSessionId } from "../../services/instances/terminate-instance-and-charge-usage.js";
import { AppError } from "../../lib/app-error.js";

export const suspendSessionInstance = catchAsync(
  async (req: Request, res: Response) => {
    const sessionToken = req.sessionToken;
    if (!sessionToken) throw new AppError("Session not found", 404);
    const { instanceId } = z
      .object({ id: z.string(), instanceId: z.string() })
      .parse(req.params);

    await terminateInstanceAndChargeUsageWithInstanceIdAndSessionId({
      instanceId: instanceId,
      sessionId: sessionToken.session_id,
    });
    res.status(200).json({ data: "Instance suspended" });
  },
);
