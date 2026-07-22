import {
  and,
  db,
  eq,
  instanceTypes,
  sandboxTypes,
  projectGithubRepos,
  projects,
  projectSshKeys,
  desc,
  projectConfig,
  proxyDomains,
  projectDomainRouting,
  routingAllowedIps,
  projectFiles,
  instances,
  githubRepos,
  projectSessions,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { projectConfigValidator, z } from "@repo/shared";
import { getDecryptedProjectConfig } from "../../services/project/project-config.js";
import { encryptData } from "../../lib/encryption-decryption.js";
import { getProxyServerUrl } from "../../lib/proxy-servers.js";
import { udpateProjectConfigByProjectIdAndUserId } from "../../services/project/update-project-service.js";
import { projectSessionRoutes } from "../../routes/project-session-routes.js";

export const getProjects = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("authentication is required", 401);

  //TODO: add pagination
  const dbProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.user_id, user.id), eq(projects.deleted, false)))
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
      .where(
        and(
          eq(projects.user_id, user.id),
          eq(projects.id, id),
          eq(projects.deleted, false),
        ),
      );

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
      .where(
        and(
          eq(projects.user_id, user.id),
          eq(projects.id, id),
          eq(projects.deleted, false),
        ),
      );

    if (!projectWithInstanceType) throw new AppError("project not found", 404);

    const sandboxTypeId = projectWithInstanceType.project.sandbox_type_id;
    const [sandboxType] = sandboxTypeId
      ? await db
          .select({ sandboxRegionId: sandboxTypes.sandbox_region })
          .from(sandboxTypes)
          .where(eq(sandboxTypes.id, sandboxTypeId))
      : [];

    const sshKeyRows = await db
      .select({ sshKeyId: projectSshKeys.ssh_key_id })
      .from(projectSshKeys)
      .where(eq(projectSshKeys.project_id, id));

    const githubRepoRows = await db
      .select({ githubRepoId: projectGithubRepos.github_repo_id })
      .from(projectGithubRepos)
      .where(eq(projectGithubRepos.project_id, id));

    const projectConfig = JSON.parse(
      await getDecryptedProjectConfig(projectWithInstanceType.project.id),
    );

    res.status(200).json({
      data: {
        project: projectWithInstanceType.project,
        provider: projectWithInstanceType.instanceType.provider,
        instanceRegionId: projectWithInstanceType.instanceType.region_id,
        instanceTypeId: projectWithInstanceType.project.instance_type_id,
        sandboxTypeId: projectWithInstanceType.project.sandbox_type_id,
        sandboxRegionId: sandboxType?.sandboxRegionId ?? null,
        sshKeyIds: sshKeyRows.map((row) => row.sshKeyId),
        githubRepoIds: githubRepoRows.map((row) => row.githubRepoId),
        config: projectConfig,
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

    const updatedProject = await udpateProjectConfigByProjectIdAndUserId(
      { ...req.body, projectId: id },
      user.id,
    );

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

    const projectRoutingWithDomains = await db
      .select()
      .from(projectDomainRouting)
      .leftJoin(
        proxyDomains,
        eq(proxyDomains.routing_id, projectDomainRouting.id),
      )
      .leftJoin(
        routingAllowedIps,
        eq(routingAllowedIps.routing_id, projectDomainRouting.id),
      )
      .where(
        and(
          eq(projectDomainRouting.user_id, user.id),
          eq(projectDomainRouting.project_id, id),
        ),
      );

    const routing = projectRoutingWithDomains[0]?.project_domain_routing;
    if (!routing) throw new AppError("routing not found", 404);

    const domains: Map<string, typeof proxyDomains.$inferSelect> = new Map();
    const ips: Map<string, typeof routingAllowedIps.$inferSelect> = new Map();
    const postfix = await getProxyServerUrl(id);

    for (const item of projectRoutingWithDomains) {
      if (item.proxy_domains) {
        domains.set(item.proxy_domains.id, {
          ...item.proxy_domains,
          domain: item.proxy_domains.domain + postfix,
        });
      }
      if (item.routing_allowed_ips) {
        ips.set(item.routing_allowed_ips.id, item.routing_allowed_ips);
      }
    }

    res.status(200).json({
      data: {
        ...routing,
        proxy_domains: [...domains.values()],
        allowed_ips: [...ips.values()],
      },
    });
  },
);

export const deleteProjectById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id } = z
      .object({
        id: z.string(),
      })
      .parse(req.params);

    const runningIntances = await db
      .select()
      .from(instances)
      .where(and(eq(instances.project_id, id), eq(instances.state, "running")));
    if (runningIntances.length > 0) {
      throw new AppError("This project have some running instances", 400);
    }
    const deletedProject = await db.transaction(async (tx) => {
      const [updatedProject] = await tx
        .update(projects)
        .set({ deleted: true, deleted_at: new Date() })
        .where(and(eq(projects.id, id), eq(projects.user_id, user.id)))
        .returning();

      if (!updatedProject) throw new AppError("Project not found ", 404);

      await tx
        .delete(projectConfig)
        .where(eq(projectConfig.project_id, updatedProject.id));

      await tx
        .delete(projectFiles)
        .where(eq(projectFiles.project_id, updatedProject.id));

      await tx
        .update(githubRepos)
        .set({
          default_project_id: null,
        })
        .where(eq(githubRepos.default_project_id, updatedProject.id));

      await tx
        .update(projectSessions)
        .set({
          archived: true,
        })
        .where(eq(projectSessions.project_id, updatedProject.id));

      return updatedProject;
    });

    res.status(200).json({
      message: "Project deleted successfully",
      data: deletedProject,
    });
  },
);
