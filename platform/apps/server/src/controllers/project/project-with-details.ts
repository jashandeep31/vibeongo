import {
  and,
  asc,
  db,
  eq,
  gitRepos,
  instanceRegions,
  instanceTypes,
  projectGitRepos,
  projectSshKeys,
  projects,
  sandboxRegions,
  sandboxTypes,
  sshKeys,
} from "@repo/db";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { getDecryptedProjectConfig } from "../../services/project/project-config.js";
import { parseStoredProjectConfig } from "../../services/project/parse-stored-project-config.js";

export const getProjectWithDetails = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);

    const [project] = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        overview: projects.overview,
        instance_type_id: projects.instance_type_id,
        sandbox_type_id: projects.sandbox_type_id,
        initial_script: projects.initial_script,
        final_script: projects.final_script,
        dev_script: projects.dev_script,
        created_at: projects.created_at,
        updated_at: projects.updated_at,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.user_id, user.id),
          eq(projects.deleted, false),
        ),
      );

    if (!project) throw new AppError("Project not found", 404);

    const [repositories, attachedSshKeys, vmTypes, sandboxRows, config] =
      await Promise.all([
        db
          .select({
            id: gitRepos.id,
            full_name: gitRepos.full_name,
            type: gitRepos.type,
            public: gitRepos.public,
            overview: gitRepos.overview,
            setup_script: gitRepos.setup_script,
          })
          .from(projectGitRepos)
          .innerJoin(gitRepos, eq(gitRepos.id, projectGitRepos.github_repo_id))
          .where(
            and(
              eq(projectGitRepos.project_id, id),
              eq(gitRepos.user_id, user.id),
            ),
          )
          .orderBy(asc(gitRepos.full_name)),
        db
          .select({ id: sshKeys.id, name: sshKeys.name })
          .from(projectSshKeys)
          .innerJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
          .where(
            and(
              eq(projectSshKeys.project_id, id),
              eq(sshKeys.user_id, user.id),
            ),
          )
          .orderBy(asc(sshKeys.name)),
        db
          .select({
            id: instanceTypes.id,
            name: instanceTypes.name,
            provider: instanceTypes.provider,
            cpu: instanceTypes.cpu,
            ram: instanceTypes.ram,
            region_id: instanceRegions.id,
            region_name: instanceRegions.name,
          })
          .from(instanceTypes)
          .leftJoin(
            instanceRegions,
            eq(instanceRegions.id, instanceTypes.region_id),
          )
          .where(eq(instanceTypes.id, project.instance_type_id))
          .limit(1),
        db
          .select({
            id: sandboxTypes.id,
            name: sandboxTypes.name,
            provider: sandboxTypes.provider,
            cpu: sandboxTypes.cpu,
            ram: sandboxTypes.ram,
            region_id: sandboxRegions.id,
            region_name: sandboxRegions.name,
          })
          .from(sandboxTypes)
          .leftJoin(
            sandboxRegions,
            eq(sandboxRegions.id, sandboxTypes.sandbox_region),
          )
          .where(eq(sandboxTypes.id, project.sandbox_type_id))
          .limit(1),
        getDecryptedProjectConfig(id).then(parseStoredProjectConfig),
      ]);

    const packages = config.packages.map((item) => {
      if (item.name === "docker") {
        return {
          name: item.name,
          containers: item.config.containers.map((container) => container.name),
        };
      }
      if (item.name === "opencode") {
        return {
          name: item.name,
          useUserConfig: item.config.use_user_config,
          model: item.config.model,
        };
      }
      return {
        name: item.name,
        useUserConfig: item.config.use_user_config,
      };
    });

    res.status(200).json({
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        overview: project.overview,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        deployment: {
          vm: vmTypes[0] ?? null,
          sandbox: sandboxRows[0] ?? null,
        },
        repositories: repositories.map(({ setup_script, ...repository }) => ({
          ...repository,
          setupScriptConfigured: Boolean(setup_script.trim()),
        })),
        sshKeys: attachedSshKeys,
        configuration: { ports: config.ports, packages },
        scripts: {
          initialConfigured: Boolean(project.initial_script.trim()),
          finalConfigured: Boolean(project.final_script.trim()),
          devConfigured: Boolean(project.dev_script.trim()),
        },
      },
    });
  },
);
