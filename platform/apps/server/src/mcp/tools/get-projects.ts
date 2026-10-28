import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getProjectOverviewForUser } from "../../services/project/get-project-overview.js";
import { getProjectWorkspaceRepositories } from "../../services/project/get-project-workspace-repositories.js";
import type { McpUser } from "../create-server.js";
import { toolResult } from "../tool-result.js";
import {
  WORKSPACE_GUIDANCE,
  WORKSPACE_REMINDER,
  WORKSPACE_ROOT,
} from "../workspace-guide.js";

export function registerProjectsTool(server: McpServer, user: McpUser): void {
  server.registerTool(
    "get_projects",
    {
      description: `List your projects with configured repository paths, unarchived sessions, and running or suspended instances. Follow hasNext by requesting the next page. Only running instances support SSH. ${WORKSPACE_REMINDER}`,
      inputSchema: z
        .object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(15),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (pagination) =>
      toolResult(async () => {
        const overview = await getProjectOverviewForUser(user.id, pagination);
        const repositories = await getProjectWorkspaceRepositories(
          user.id,
          overview.data.map((project) => project.id),
        );
        return {
          ...overview,
          workspaceGuidance: WORKSPACE_GUIDANCE,
          data: overview.data.map((project) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            repositories: repositories
              .filter((repo) => repo.projectId === project.id)
              .map((repo) => {
                const folder_name = repo.full_name.split("/").pop()!;
                return {
                  id: repo.id,
                  full_name: repo.full_name,
                  type: repo.type,
                  folder_name,
                  workspace_path: `${WORKSPACE_ROOT}/${folder_name}`,
                };
              }),
            sessions: project.sessions.map((session) => ({
              id: session.id,
              name: session.name,
              description: session.description,
              category: session.category,
              instances: session.instances.map((instance) => ({
                id: instance.id,
                name: instance.name,
                state: instance.state,
                runtime_kind: instance.runtime_kind,
                started_at: instance.started_at,
                terminates_at: instance.terminates_at,
              })),
            })),
          })),
        };
      }),
  );
}
