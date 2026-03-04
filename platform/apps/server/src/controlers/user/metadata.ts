import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";

export const getUserMetadata = catchAsync(
  async (req: Request, res: Response) => {},
);
