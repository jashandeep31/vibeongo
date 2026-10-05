import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";
import {
  db,
  eq,
  asc,
  gitRepos,
  projectGitRepos,
  projectSessions,
  projectSessionTasks,
  projectSshKeys,
  projects,
  sshKeys,
  instances,
  projectDomainRouting,
  proxyDomains,
  instanceOpenRouterKeys,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { getConfigReadyGitRepos } from "../../github-app-functions/get-project-ready-github-repos.js";
import { env } from "../../lib/env.js";
import { getDecryptedProjectConfig } from "../../services/project/project-config.js";
import { getProxyServerUrl } from "../../lib/proxy-servers.js";
import { resolveProjectUserConfigs } from "../../services/user-config/resolve-project-user-configs.js";
import { getChatgptAccessToken } from "../../services/user-config/get-chatgpt-access-token.js";
import { parseStoredProjectConfig } from "../../services/project/parse-stored-project-config.js";
import { decryptData } from "../../lib/encryption-decryption.js";
import {
  vibeongoAiModels,
  vibeongoAiModelsSchema,
} from "../../services/opencode/vibeongo-ai-models.js";

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
    const parsedConfig = parseStoredProjectConfig(stringfiedConfig);
    const resolvedProjectConfig = await appendChatgptCredentialsToOpencodeConfig(
      project.user_id,
      await appendVibeongoAiKeyToOpencodeConfig(
        instanceId,
        withEmptyClaudePackage(
          await resolveProjectUserConfigs(parsedConfig, project.user_id),
        ),
      ),
    );

    const [tasks, repos, keys] = await Promise.all([
      db
        .select()
        .from(projectSessionTasks)
        .orderBy(asc(projectSessionTasks.order_number))
        .where(eq(projectSessionTasks.project_session_id, id)),

      db
        .select({ repo: gitRepos })
        .from(projectGitRepos)
        .leftJoin(gitRepos, eq(gitRepos.id, projectGitRepos.github_repo_id))
        .where(eq(projectGitRepos.project_id, project.id)),

      db
        .select({ value: sshKeys.value })
        .from(projectSshKeys)
        .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
        .where(eq(projectSshKeys.project_id, project.id)),
    ]);

    const validRepos = repos
      .map((r) => r.repo)
      .filter((r): r is typeof gitRepos.$inferSelect => r !== null);

    const config = {
      ...resolvedProjectConfig,
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
      vibeongoAiModels: vibeongoAiModelsSchema.parse(vibeongoAiModels),
      repos: await getConfigReadyGitRepos(validRepos, { instanceId }),
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

    res.set("Cache-Control", "no-store");
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
type ResolvedProjectConfig = Awaited<
  ReturnType<typeof resolveProjectUserConfigs>
>;

function withEmptyClaudePackage(
  config: ResolvedProjectConfig,
): ResolvedProjectConfig {
  const packages = config.packages.filter(
    (projectPackage) => projectPackage.name !== "claude",
  );
  return {
    ...config,
    packages: [
      ...packages,
      { name: "claude", config: { auth_json: {}, use_user_config: true } },
    ],
  };
}

async function appendVibeongoAiKeyToOpencodeConfig(
  instanceId: string,
  config: ResolvedProjectConfig,
): Promise<ResolvedProjectConfig> {
  const [openrouterInstanceKey] = await db
    .select()
    .from(instanceOpenRouterKeys)
    .where(eq(instanceOpenRouterKeys.instance_id, instanceId));

  if (!openrouterInstanceKey) return config;

  const decryptedKey = decryptData({
    iv: openrouterInstanceKey.iv,
    encrypted: openrouterInstanceKey.encrypted_key,
    tag: openrouterInstanceKey.tag,
  });

  const opencodePackage = config.packages.find(
    (projectPackage) => projectPackage.name === "opencode",
  );

  if (!opencodePackage) return config;

  opencodePackage.config.auth_json = [
    ...opencodePackage.config.auth_json,
    {
      id: `vibeongo_ai-${instanceId}`,
      integrationID: "vibeongo_ai",
      label: "Vibeongo AI",
      active: true,
      value: { type: "key", key: decryptedKey },
    },
  ];

  return config;
}

async function appendChatgptCredentialsToOpencodeConfig(
  userId: string,
  config: ResolvedProjectConfig,
): Promise<ResolvedProjectConfig> {
  const opencodePackage = config.packages.find(
    (projectPackage) => projectPackage.name === "opencode",
  );
  if (!opencodePackage || !opencodePackage.config.use_user_config) return config;

  const token = await getChatgptAccessToken(userId, { optional: true });
  if (!token) return config;

  const metadata = {
    clientID: "Managed by Vibeongo",
    managedBy: "vibeongo",
    scopes: token.scopes,
  };
  const credentialId = `cred_${token.credential_id}`;
  opencodePackage.config.auth_json = [
    ...opencodePackage.config.auth_json
      .filter((entry) => entry.id !== credentialId)
      .map((entry) =>
        entry.integrationID === "openai" ? { ...entry, active: false } : entry,
      ),
    {
      id: credentialId,
      integrationID: "openai",
      label: "Vibeongo OpenAI",
      active: true,
      value: {
        type: "oauth",
        methodID: "chatgpt-token-sharing",
        access: token.access_token,
        // Display placeholders only; real refresh credentials stay on the server.
        refresh: "Managed by Vibeongo",
        expires: token.access_token_expires_at.getTime(),
        metadata,
      },
    },
  ];

  return config;
}
