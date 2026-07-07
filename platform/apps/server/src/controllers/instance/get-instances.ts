import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import {
  and,
  customQuery,
  db,
  desc,
  eq,
  instances,
  projects,
  sql,
} from "@repo/db";
import { z } from "zod";
import { commonFilterSchema } from "@repo/shared";

export const getUserInstances = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;

    const { state, include_project, page, limit, project_id, session_id } =
      commonFilterSchema
        .extend({
          state: z.enum(["running", "terminated", "all"]).default("all"),
          include_project: z
            .enum(["true", "false"])
            .transform((v) => v === "true")
            .default(false),
          project_id: z.string().optional(),
          session_id: z.string().optional(),
        })
        .parse(req.query);
    if (!user) throw new AppError("authentication is required", 400);

    const where = and(
      eq(instances.user_id, user.id),
      state !== "all" ? eq(instances.state, state) : undefined,
      project_id ? eq(instances.project_id, project_id) : undefined,
      session_id ? eq(instances.project_session_id, session_id) : undefined,
    );

    if (include_project) {
      const rows = await customQuery(
        db
          .select({
            instance: instances,
            project: {
              id: projects.id,
              name: projects.name,
              user_id: projects.user_id,
            },
          })
          .from(instances)
          .leftJoin(projects, eq(instances.project_id, projects.id))
          .where(where)
          .orderBy(desc(instances.created_at))
          .$dynamic(),
        page,
        limit,
      );

      const refinedData = new Map<
        string,
        typeof instances.$inferSelect & {
          project: Pick<
            typeof projects.$inferSelect,
            "id" | "name" | "user_id"
          > | null;
        }
      >();

      for (const { instance, project } of rows) {
        const existingInstance = refinedData.get(instance.id);

        refinedData.set(instance.id, {
          ...(existingInstance ?? instance),
          project: project ?? existingInstance?.project ?? null,
        });
      }

      const data = Array.from(refinedData.values());

      res.status(200).json({
        data: data.slice(0, limit),
        page,
        hasNext: data.length > limit,
      });
      return;
    }

    const rows = await customQuery(
      db
        .select()
        .from(instances)
        .where(where)
        .orderBy(desc(instances.created_at))
        .$dynamic(),
      page,
      limit,
    );

    res.status(200).json({
      data: rows.slice(0, limit).map((instance) => ({
        ...instance,
        project: null,
      })),
      page,
      hasNext: rows.length > limit,
    });
  },
);

export const getInstanceById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string") throw new AppError("Id should be string ", 400);
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 400);

    const [row] = await db
      .select()
      .from(instances)
      .where(and(eq(instances.user_id, user.id), eq(instances.id, id)));

    if (!row) throw new AppError("instance not found", 404);

    res.status(200).json({
      data: row,
    });
  },
);

export const updateInstanceById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { id } = z
      .object({
        id: z.uuid(),
      })
      .parse(req.params);

    const { terminatesTimeUpdate } = z
      .object({
        terminatesTimeUpdate: z
          .object({
            action: z.enum(["increase", "decrease"]).default("increase"),
            timeInMinutes: z.number().min(1),
          })
          .optional(),
      })
      .parse(req.body);

    const updateData: Partial<{
      [K in keyof typeof instances.$inferInsert]: any;
    }> = {};

    if (terminatesTimeUpdate) {
      const sign = terminatesTimeUpdate.action === "decrease" ? -1 : 1;
      const minutes = sign * terminatesTimeUpdate.timeInMinutes;
      updateData.terminates_at = sql`${instances.terminates_at} + (${minutes} * interval '1 minute')`;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError("No update fields provided", 400);
    }

    const [result] = await db
      .update(instances)
      .set(updateData)
      .where(
        and(
          eq(instances.id, id),
          eq(instances.user_id, user.id),
          eq(instances.state, "running"),
        ),
      )
      .returning();

    if (!result) {
      throw new AppError("Running instance not found", 404);
    }

    res.status(200).json({ data: result });
  },
);
