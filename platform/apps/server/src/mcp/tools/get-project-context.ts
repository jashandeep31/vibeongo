import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getProjectContextForUser } from "../../services/project/get-project-context.js";
import { getProjectNetworkSummary } from "../../services/project/project-network.js";
import { getProjectContainers } from "../../services/project/get-project-containers.js";
import type { McpUser } from "../create-server.js";
import { toolResult } from "../tool-result.js";
import { WORKSPACE_ROOT, WORKSPACE_GUIDE_URI } from "../workspace-guide.js";

export function registerProjectContextTool(
  server: McpServer,
  user: McpUser,
): void {
  server.registerTool(
    "get_project_context",
    {
      description:
        "Read a project's saved architecture and repository overviews, workspace paths, domains, allowed IPs, configured containers, and project ports. Use OpenCode CLI inside the project session sandbox for all project changes and pull-request work. Takes only projectId. Contains no sessions, instances, or credentials. Missing overviews stay empty; this is saved context, not live code or container inspection.",
      inputSchema: z
        .object({
          projectId: z.uuid().describe("Project ID returned by get_projects."),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId }) =>
      toolResult(async () => {
        const { project, repositories } = await getProjectContextForUser(
          user.id,
          projectId,
        );
        const [network, configuration] = await Promise.all([
          getProjectNetworkSummary(user.id, projectId),
          getProjectContainers(user.id, projectId),
        ]);
        return {
          project,
          network,
          configuration,
          workspaceRoot: WORKSPACE_ROOT,
          repositories: repositories.map((repo) => {
            const folderName = repo.full_name.split("/").pop()!;
            return {
              id: repo.id,
              fullName: repo.full_name,
              provider: repo.type,
              folderName,
              workspacePath: `${WORKSPACE_ROOT}/${folderName}`,
              overview: repo.overview ?? "",
            };
          }),
          workflow: {
            guideTool: "get_workspace_guide",
            guideResourceUri: WORKSPACE_GUIDE_URI,
            requiredChangeTool: "opencode",
            defaultChangeTool: "opencode",
            defaultRuntime: "sandbox",
            instructions:
              "For project changes, commits, and pull-request work, use the installed OpenCode CLI inside the project session sandbox, from the relevant repository after reading its local instructions. Ask OpenCode to create or update the pull request when requested and report its actual URL/result. Do not claim a PR exists until confirmed. Runtime defaults to sandbox without asking VM or sandbox. Use MCP network tools for explicit domain/IP access changes.",
          },
          contextSource:
            "Saved project/repository overviews and domain, IP, and container configuration; not a live filesystem or Docker inspection. Workspace paths describe the configured layout, not verified directories.",
        };
      }),
  );
}
