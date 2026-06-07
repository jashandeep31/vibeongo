import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { and, customQuery, db, desc, eq, instances, projects } from "@repo/db";
import { z } from "zod";
import { commonFilterSchema } from "@repo/shared";

export const getUserInstances = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;

    const { running, include_project, page, limit } = commonFilterSchema
      .extend({
        running: z
          .enum(["true", "false"])
          .transform((v) => v === "true")
          .default(false),
        include_project: z
          .enum(["true", "false"])
          .transform((v) => v === "true")
          .default(false),
      })
      .parse(req.query);
    if (!user) throw new AppError("authentication is required", 400);

    const where = and(
      eq(instances.user_id, user.id),
      running ? eq(instances.state, "running") : undefined,
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

export const getInstancesByProjectId = catchAsync(
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (typeof projectId !== "string") {
      throw new AppError("projectId should be string", 400);
    }
    const { state } = z
      .object({
        state: z.enum(["terminated", "running", "all"]).default("running"),
      })
      .parse(req.query);
    const filters = [];
    if (state !== "all") {
      filters.push(eq(instances.state, state));
    }
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 400);

    const rows = await db
      .select()
      .from(instances)
      .where(
        and(
          eq(instances.user_id, user.id),
          eq(instances.project_id, projectId),
          ...filters,
        ),
      )
      .orderBy(desc(instances.created_at));

    res.status(200).json({
      data: rows,
    });
  },
);
