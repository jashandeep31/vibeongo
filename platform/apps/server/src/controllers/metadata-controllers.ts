import { Request, Response } from "express";
import {
  db,
  eq,
  instanceRegions,
  instanceTypes,
  sandboxRegions,
  sandboxTypes,
} from "@repo/db";
import { AppError } from "../lib/app-error.js";
import { catchAsync } from "../lib/catch-async.js";

const getRegionId = (req: Request) => {
  const { regionId } = req.params;
  if (!regionId || typeof regionId !== "string") {
    throw new AppError("Region ID is required", 400);
  }

  return regionId;
};

export const getInstanceRegions = catchAsync(
  async (_req: Request, res: Response) => {
    const regions = await db.select().from(instanceRegions);
    res.status(200).json({ data: regions });
  },
);

export const getInstanceTypesByRegion = catchAsync(
  async (req: Request, res: Response) => {
    const instanceTypesData = await db
      .select()
      .from(instanceTypes)
      .where(eq(instanceTypes.region_id, getRegionId(req)));

    res.status(200).json({ data: instanceTypesData });
  },
);

export const getSandboxRegions = catchAsync(
  async (_req: Request, res: Response) => {
    const regions = await db.select().from(sandboxRegions);
    res.status(200).json({ data: regions });
  },
);

export const getSandboxTypesByRegion = catchAsync(
  async (req: Request, res: Response) => {
    const sandboxTypesData = await db
      .select()
      .from(sandboxTypes)
      .where(eq(sandboxTypes.sandbox_region, getRegionId(req)));

    res.status(200).json({ data: sandboxTypesData });
  },
);
