import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";
import { db, projectSessions } from "@repo/db";

export const projectSesssionConfig = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = z
      .object({
        id: z.string(),
      })
      .parse(req.params);

    const rows = await db.select().from(projectSessions);
  },
);
