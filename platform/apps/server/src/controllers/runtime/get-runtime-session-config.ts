import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";
import {
  db,
  eq,
  asc,
  githubRepos,
  projectGithubRepos,
  projectSessions,
  projectSessionTasks,
  projectSshKeys,
  projects,
  sshKeys,
  instances,
  projectDomainRouting,
  proxyDomains,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { getConfigReadyGithubRepos } from "../../github-app-functions/get-project-ready-github-repos.js";
import { env } from "../../lib/env.js";
import { getDecryptedProjectConfig } from "../../services/project/project-config.js";
import { getProxyServerUrl } from "../../lib/proxy-servers.js";

export const getRuntimeSessionConfig = catchAsync(
  async (req: Request, res: Response) => {
    const { id, instanceId } = z
      .object({ id: z.string(), instanceId: z.string() })
      .parse(req.params);

    const [sessionRow] = await db
      .select({
        project_session: projectSessions,
        project: projects,
        instance: instances,
      })
      .from(projectSessions)
      .leftJoin(projects, eq(projects.id, projectSessions.project_id))
      .leftJoin(instances, eq(instances.id, instanceId))
      .where(eq(projectSessions.id, id));

    if (
      !sessionRow?.project_session ||
      !sessionRow?.project ||
      !sessionRow.instance
    )
      throw new AppError("Project session not found", 404);

    const { project, instance } = sessionRow;
    const stringfiedConfig = await getDecryptedProjectConfig(project.id);
    const parsedConfig = JSON.parse(stringfiedConfig);

    const [tasks, repos, keys] = await Promise.all([
      db
        .select()
        .from(projectSessionTasks)
        .orderBy(asc(projectSessionTasks.order_number))
        .where(eq(projectSessionTasks.project_session_id, id)),

      db
        .select({ repo: githubRepos })
        .from(projectGithubRepos)
        .leftJoin(
          githubRepos,
          eq(githubRepos.id, projectGithubRepos.github_repo_id),
        )
        .where(eq(projectGithubRepos.project_id, project.id)),

      db
        .select({ value: sshKeys.value })
        .from(projectSshKeys)
        .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
        .where(eq(projectSshKeys.project_id, project.id)),
    ]);

    const validRepos = repos
      .map((r) => r.repo)
      .filter((r): r is typeof githubRepos.$inferSelect => r !== null);

    const config = {
      ...(parsedConfig as any),
      publicIp: instance.public_ip,
      serverBaseUrl: env.SERVER_URL,
      sessionId: sessionRow.project_session.id,
      instanceConfig: instance.config,
      instanceId,
      instanceName: instance.name,
      projectId: project.id,
      initialScript: project.initial_script,
      finalScript: project.final_script,
      devScript: project.dev_script,
      repos: await getConfigReadyGithubRepos(validRepos),
      ssh_keys: keys.map((k) => k.value).filter((v): v is string => !!v),
      tasks: tasks.map((t) => ({
        id: t.id,
        folder_name: t.folder_name,
        task: t.task,
        agent: t.agent,
        model: t.model,
        done: t.done,
      })),
    };

    console.log(config);
    res.status(200).json({ data: config });
  },
);

export const getSessionDomains = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);

    const [sessionRow] = await db
      .select({
        project_session: projectSessions,
        project: projects,
      })
      .from(projectSessions)
      .innerJoin(projects, eq(projects.id, projectSessions.project_id))
      .where(eq(projectSessions.id, id));

    if (!sessionRow) throw new AppError("Project session not found", 404);
    const { project } = sessionRow;

    const projectDomainRoutingWithDomainsRow = await db
      .select({
        routing: projectDomainRouting,
        domains: proxyDomains,
      })
      .from(projectDomainRouting)
      .leftJoin(
        proxyDomains,
        eq(proxyDomains.routing_id, projectDomainRouting.id),
      )
      .where(eq(projectDomainRouting.project_id, project.id));

    interface Domain {
      id: string;
      domain: string;
      target_port: number;
      is_editable: boolean;
    }
    const domainsMap: Map<string, Domain> = new Map();
    const postfix = await getProxyServerUrl(project.id);

    for (const item of projectDomainRoutingWithDomainsRow) {
      if (item.domains) {
        if (!domainsMap.has(item.domains.id))
          domainsMap.set(item.domains.id, {
            id: item.domains.id,
            domain: "https://" + item.domains.domain + postfix,
            is_editable: item.domains.is_editable,
            target_port: item.domains.target_port,
          });
      }
    }

    res.status(200).json({
      data: {
        domains: Array.from(domainsMap.values()),
      },
    });
  },
);
