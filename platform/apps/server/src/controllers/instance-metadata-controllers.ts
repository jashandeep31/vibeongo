import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import { db, instanceRegions, eq, instanceTypes } from "@repo/db";
import { AppError } from "../lib/app-error.js";

export const getIntanceRegions = catchAsync(
  async (_req: Request, res: Response) => {
    const regions = await db.select().from(instanceRegions);
    res.status(200).json({
      data: regions,
    });
    return;
  },
);

export const getInstanceTypesByRegion = catchAsync(
  async (req: Request, res: Response) => {
    const { regionId } = req.params;
    if (!regionId || typeof regionId !== "string")
      throw new AppError("Region ID is required", 400);

    const instanceTypesData = await db
      .select()
      .from(instanceTypes)
      .where(eq(instanceTypes.region_id, regionId));

    res.status(200).json({
      data: instanceTypesData,
    });
  },
);
