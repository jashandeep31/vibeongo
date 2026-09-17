import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import {
  commonFilterSchema,
  projectAutomationSchema,
  projectAutomationTaskSchema,
  projectSessionTaskSchema,
  z,
} from "@repo/shared";
import {
  customQuery,
  db,
  eq,
  and,
  projectAutomations,
  projectAutomationTasks,
  projects,
} from "@repo/db";

export const getProjectAutomations = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const { page, limit } = commonFilterSchema.parse(req.query);

    const query = db
      .select()
      .from(projectAutomations)
      .where(eq(projectAutomations.user_id, user.id))
      .$dynamic();

    const projectAutomationsResponse = await customQuery(query, page, limit);

    res.status(200).json({
      data: {
        automations: projectAutomationsResponse,
        has_next: projectAutomationsResponse.length > limit,
        page,
      },
    });
  },
);

export const createProjectAutomation = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const projectAutomationData = projectAutomationSchema
      .extend({
        tasks: z.array(projectAutomationTaskSchema).min(1),
      })
      .parse(req.body);

    const project = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectAutomationData.project_id),
          eq(projects.user_id, user.id),
        ),
      );
    if (!project) throw new AppError("Project not found", 404);

    await db.transaction(async (tx) => {
      const [projectAutomation] = await tx
        .insert(projectAutomations)
        .values({
          name: projectAutomationData.name,
          description: projectAutomationData.description,
          user_id: user.id,
          project_id: projectAutomationData.project_id,
          cron_expression: projectAutomationData.cron_expression,
          timezone: projectAutomationData.timezone,
        })
        .returning();

      if (!projectAutomation)
        throw new AppError("Failed to create project", 500);

      await tx.insert(projectAutomationTasks).values(
        projectAutomationData.tasks.map((t) => {
          return {
            project_automation_id: projectAutomation.id,
            path_from_code: t.path_from_code,
            task_prompt: t.task_prompt,
            agent: t.agent,
            order_number: t.order_number,
            model: t.model,
          };
        }),
      );
    });

    res
      .status(200)
      .json({ message: "Project automation created successfully" });
  },
);
