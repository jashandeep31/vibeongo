import {
  and,
  db,
  eq,
  githubRepos,
  inArray,
  instances,
  instanceTypes,
  projectGithubRepos,
  projects,
  projectSshKeys,
  sshKeys,
  sql,
  desc,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { env } from "../../lib/env.js";
import { projectConfigValidator } from "@repo/shared";

export const getProjects = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("authentication is required", 401);

  //TODO: add pagination
  const dbProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.user_id, user.id))
    .orderBy(desc(projects.created_at));

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

export const getProjectConfigForEdit = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id } = req.params;
    if (!id || typeof id !== "string")
      throw new AppError("project id is required", 400);

    const [projectWithInstanceType] = await db
      .select({
        project: projects,
        instanceType: instanceTypes,
      })
      .from(projects)
      .innerJoin(instanceTypes, eq(instanceTypes.id, projects.instance_type_id))
      .where(and(eq(projects.user_id, user.id), eq(projects.id, id)));

    if (!projectWithInstanceType) throw new AppError("project not found", 404);

    const sshKeyRows = await db
      .select({ sshKeyId: projectSshKeys.ssh_key_id })
      .from(projectSshKeys)
      .where(eq(projectSshKeys.project_id, id));

    const githubRepoRows = await db
      .select({ githubRepoId: projectGithubRepos.github_repo_id })
      .from(projectGithubRepos)
      .where(eq(projectGithubRepos.project_id, id));

    res.status(200).json({
      data: {
        project: projectWithInstanceType.project,
        instanceRegionId: projectWithInstanceType.instanceType.region_id,
        instanceTypeId: projectWithInstanceType.project.instance_type_id,
        sshKeyIds: sshKeyRows.map((row) => row.sshKeyId),
        githubRepoIds: githubRepoRows.map((row) => row.githubRepoId),
        config: projectWithInstanceType.project.config,
      },
    });
  },
);

export const updateProjectById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id } = req.params;
    if (!id || typeof id !== "string")
      throw new AppError("project id is required", 400);

    const parsedData = projectConfigValidator.parse(req.body);
    const githubRepoIds = [...new Set(parsedData.githubRepoIds)];
    const sshKeyIds = [...new Set(parsedData.sshKeyIds)];

    const [projectRow] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.user_id, user.id), eq(projects.id, id)));

    if (!projectRow) throw new AppError("project not found", 404);

    const validRepos = githubRepoIds.length
      ? await db
          .select({ id: githubRepos.id })
          .from(githubRepos)
          .where(
            and(
              eq(githubRepos.user_id, user.id),
              inArray(githubRepos.id, githubRepoIds),
            ),
          )
      : [];

    if (validRepos.length !== githubRepoIds.length)
      throw new AppError("invalid github repository selected", 400);

    const validSshKeys = sshKeyIds.length
      ? await db
          .select({ id: sshKeys.id })
          .from(sshKeys)
          .where(
            and(eq(sshKeys.user_id, user.id), inArray(sshKeys.id, sshKeyIds)),
          )
      : [];

    if (validSshKeys.length !== sshKeyIds.length)
      throw new AppError("invalid ssh key selected", 400);

    const updatedProject = await db.transaction(async (tx) => {
      const [updatedProjectRow] = await tx
        .update(projects)
        .set({
          name: parsedData.name,
          description: parsedData.description,
          instance_type_id: parsedData.instanceTypeId,
          config: parsedData.config,
          initial_script: parsedData.initial_script,
          final_script: parsedData.final_script,
          updated_at: new Date(),
        })
        .where(and(eq(projects.user_id, user.id), eq(projects.id, id)))
        .returning();

      if (!updatedProjectRow) throw new AppError("project not updated", 400);

      await tx
        .delete(projectGithubRepos)
        .where(eq(projectGithubRepos.project_id, id));
      await tx.delete(projectSshKeys).where(eq(projectSshKeys.project_id, id));

      if (validRepos.length) {
        await tx.insert(projectGithubRepos).values(
          validRepos.map((repo) => ({
            project_id: id,
            github_repo_id: repo.id,
          })),
        );
      }

      if (validSshKeys.length) {
        await tx.insert(projectSshKeys).values(
          validSshKeys.map((sshKey) => ({
            project_id: id,
            ssh_key_id: sshKey.id,
          })),
        );
      }

      return updatedProjectRow;
    });

    res.status(200).json({
      message: "Project updated successfully",
      data: updatedProject,
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
          SELECT jsonb_agg(to_jsonb(pd) )
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

    // if (1 === 1 && env.NODE_ENV !== "development") {
    //   // TODO: enable this feature
    //   // the reason if the user had created the instance but before getting allocated as aws takes little time to allocate the ip4 address
    //   // but user instantely delete the project and the instance is still running
    //   throw new AppError("Feature is stopped temporarily", 400);
    // }
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
