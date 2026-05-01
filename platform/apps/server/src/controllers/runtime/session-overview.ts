import { Response, Request } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";
import { db, eq, projectSessions } from "@repo/db";
import { AppError } from "../../lib/app-error.js";

export const getSessionOverview = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = z
      .object({
        id: z.string(),
      })
      .parse(req.params);

    const [session] = await db
      .select()
      .from(projectSessions)
      .where(eq(projectSessions.id, id));
    if (!session) throw new AppError("Session not found", 404);

    const overview = session.overview;

    res.status(200).json({ data: overview ? overview : "" });
  },
);

export const updateSessionOverview = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = z
      .object({
        id: z.string(),
      })
      .parse(req.params);

    const { overview } = z
      .object({
        overview: z.string(),
      })
      .parse(req.body);

    await db
      .update(projectSessions)
      .set({ overview })
      .where(eq(projectSessions.id, id));

    res.status(201).json({ message: "Overview updated" });
  },
);
