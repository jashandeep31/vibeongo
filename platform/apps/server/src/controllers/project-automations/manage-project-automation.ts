import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import {
  commonFilterSchema,
  getProjectAutomationSchedule,
  projectAutomationSchema,
  projectAutomationTaskSchema,
  z,
} from "@repo/shared";
import {
  customQuery,
  db,
  eq,
  getTableColumns,
  isNull,
  and,
  asc,
  projectAutomations,
  projectAutomationTasks,
  projects,
  projectAutomationRuns,
} from "@repo/db";
import { getNextAutomationRun } from "../../services/project-automations/get-next-automation-run.js";

export const getProjectAutomations = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const { page, limit } = commonFilterSchema.parse(req.query);

    const query = db
      .select({
        ...getTableColumns(projectAutomations),
        project_name: projects.name,
      })
      .from(projectAutomations)
      .innerJoin(projects, eq(projects.id, projectAutomations.project_id))
      .where(
        and(
          eq(projectAutomations.user_id, user.id),
          isNull(projectAutomations.deleted_at),
        ),
      )
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

    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectAutomationData.project_id),
          eq(projects.user_id, user.id),
        ),
      );
    if (!project) throw new AppError("Project not found", 404);

    const schedule = getProjectAutomationSchedule(
      projectAutomationData.schedule_id,
    );
    const nextRunAt = getNextAutomationRun(
      schedule.cronExpression,
      projectAutomationData.timezone,
    );

    await db.transaction(async (tx) => {
      const [projectAutomation] = await tx
        .insert(projectAutomations)
        .values({
          name: projectAutomationData.name,
          description: projectAutomationData.description,
          user_id: user.id,
          project_id: projectAutomationData.project_id,
          cron_expression: schedule.cronExpression,
          next_run_at: nextRunAt,
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

export const updateProjectAutomation = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const projectAutomationData = projectAutomationSchema
      .extend({ tasks: z.array(projectAutomationTaskSchema).min(1) })
      .parse(req.body);

    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectAutomationData.project_id),
          eq(projects.user_id, user.id),
        ),
      );
    if (!project) throw new AppError("Project not found", 404);

    const schedule = getProjectAutomationSchedule(
      projectAutomationData.schedule_id,
    );
    const nextRunAt = getNextAutomationRun(
      schedule.cronExpression,
      projectAutomationData.timezone,
    );

    const result = await db.transaction(async (tx) => {
      const [automation] = await tx
        .select({ id: projectAutomations.id })
        .from(projectAutomations)
        .where(
          and(
            eq(projectAutomations.id, id),
            eq(projectAutomations.user_id, user.id),
            isNull(projectAutomations.deleted_at),
          ),
        )
        .limit(1);

      if (!automation) throw new AppError("Project automation not found", 404);

      const [updatedAutomation] = await tx
        .update(projectAutomations)
        .set({
          name: projectAutomationData.name,
          description: projectAutomationData.description ?? null,
          project_id: projectAutomationData.project_id,
          cron_expression: schedule.cronExpression,
          next_run_at: nextRunAt,
          timezone: projectAutomationData.timezone,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(projectAutomations.id, id),
            eq(projectAutomations.user_id, user.id),
            isNull(projectAutomations.deleted_at),
          ),
        )
        .returning();

      if (!updatedAutomation)
        throw new AppError("Failed to update project automation", 500);

      await tx
        .delete(projectAutomationTasks)
        .where(eq(projectAutomationTasks.project_automation_id, id));

      const updatedTasks = await tx
        .insert(projectAutomationTasks)
        .values(
          projectAutomationData.tasks.map((task) => ({
            project_automation_id: id,
            path_from_code: task.path_from_code,
            task_prompt: task.task_prompt,
            agent: task.agent,
            order_number: task.order_number,
            model: task.model,
          })),
        )
        .returning();

      return { project_automation: updatedAutomation, tasks: updatedTasks };
    });

    res.status(200).json({
      message: "Project automation updated successfully",
      data: result,
    });
  },
);

export const getProjectAutomation = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const { id } = z
      .object({
        id: z.uuid(),
      })
      .parse(req.params);

    const projectAutomationWithTasks = await db
      .select()
      .from(projectAutomations)
      .innerJoin(projects, eq(projects.id, projectAutomations.project_id))
      .leftJoin(
        projectAutomationTasks,
        eq(projectAutomationTasks.project_automation_id, projectAutomations.id),
      )
      .where(
        and(
          eq(projectAutomations.id, id),
          eq(projectAutomations.user_id, user.id),
          isNull(projectAutomations.deleted_at),
        ),
      )
      .orderBy(asc(projectAutomationTasks.order_number));

    if (!projectAutomationWithTasks[0]?.project_automations)
      throw new AppError("Project automation not found", 404);

    res.status(200).json({
      data: {
        project_automation: {
          ...projectAutomationWithTasks[0].project_automations,
          project_name: projectAutomationWithTasks[0].projects.name,
        },
        tasks: projectAutomationWithTasks.flatMap((row) =>
          row.project_automation_tasks ? [row.project_automation_tasks] : [],
        ),
      },
    });
  },
);

export const deleteProjectAutomation = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const { id } = z.object({ id: z.uuid() }).parse(req.params);

    const [deletedAutomation] = await db
      .update(projectAutomations)
      .set({
        deleted_at: new Date(),
        next_run_at: null,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(projectAutomations.id, id),
          eq(projectAutomations.user_id, user.id),
          isNull(projectAutomations.deleted_at),
        ),
      )
      .returning({ id: projectAutomations.id });

    if (!deletedAutomation)
      throw new AppError("Project automation not found", 404);

    res.status(200).json({
      message: "Project automation deleted successfully",
    });
  },
);
