import { and, db, eq, instances, projects, sql } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { env } from "../../lib/env.js";

export const getProjects = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("authentication is required", 401);

  //TODO: add pagination
  const dbProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.user_id, user.id));

  res.status(200).json({
    message: "Projects retrieved successfully",
    data: dbProjects,
  });
});

export const getProjectById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id } = req.params;
    if (!id || typeof id !== "string")
      throw new AppError("project id is required", 400);

    const [projectRow] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.user_id, user.id), eq(projects.id, id)));

    if (!projectRow) throw new AppError("project not found", 404);

    res.status(200).json({
      data: projectRow,
    });
  },
);

export const getProjectDomainsById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id } = req.params;
    if (!id || typeof id !== "string")
      throw new AppError("project id is required", 400);
    const dbRes = await db.execute(sql`SELECT 
  jsonb_agg(
    to_jsonb(pdr) || jsonb_build_object(
      'proxy_domains', 
      COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(pd))
          FROM proxy_domains pd 
          WHERE pd.routing_id = pdr.id
        ), 
        '[]'::jsonb
      ),
      'allowed_ips',
      COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(rai))
          FROM routing_allowed_ips rai
          WHERE rai.routing_id = pdr.id
        ),
        '[]'::jsonb
      )
    )
  ) AS result
FROM project_domain_routing pdr  
WHERE pdr.project_id = ${id};`);

    //NOTE: make it typesafe but its working too as we not using type can't check even looking for review on this
    const refinedData = (dbRes.rows[0]?.result as any)[0];

    res.status(200).json({
      data: refinedData,
    });
  },
);

export const deleteProjectById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id } = req.params;
    if (!id || typeof id !== "string")
      throw new AppError("project id is required", 400);

    if (1 === 1 && env.NODE_ENV !== "development") {
      // TODO: enable this feature
      // the reason if the user had created the instance but before getting allocated as aws takes little time to allocate the ip4 address
      // but user instantely delete the project and the instance is still running
      throw new AppError("Feature is stopped temporarily", 400);
    }
    // check if any instance is associated with the project and its not terminated
    const projectInstances = await db
      .select()
      .from(instances)
      .where(and(eq(instances.project_id, id), eq(instances.state, "running")));

    if (projectInstances.length > 0) {
      throw new AppError("project has running instances, cannot delete", 400);
    }

    await db
      .delete(projects)
      .where(and(eq(projects.user_id, user.id), eq(projects.id, id)));

    res.status(200).json({
      message: "Project deleted successfully",
    });
  },
);
