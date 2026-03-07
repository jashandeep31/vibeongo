import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import { db, instanceRegions } from "@repo/db";

export const getIntanceRegions = catchAsync(
  async (_req: Request, res: Response) => {
    const regions = await db.select().from(instanceRegions);
    res.status(200).json({
      data: regions,
    });
    return;
  },
);
