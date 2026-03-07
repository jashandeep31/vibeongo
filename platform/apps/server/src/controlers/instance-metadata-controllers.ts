import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import { instanceRegionsEnum } from "@repo/db";

export const getIntanceRegions = catchAsync(
  async (_req: Request, res: Response) => {
    const regions = instanceRegionsEnum.enumValues;
    res.status(200).json({
      data: { regions },
    });
    return;
  },
);
