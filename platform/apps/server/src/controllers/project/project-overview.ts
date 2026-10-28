import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { getProjectOverviewForUser } from "../../services/project/get-project-overview.js";

const overviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});

export const getProjectOverview = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);
    const result = await getProjectOverviewForUser(
      user.id,
      overviewQuerySchema.parse(req.query),
    );
    res.status(200).json(result);
  },
);
