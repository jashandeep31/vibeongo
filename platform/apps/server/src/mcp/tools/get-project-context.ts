import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getProjectContextForUser } from "../../services/project/get-project-context.js";
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
        "Read a project's saved architecture overview and configured repositories, including repository overviews, providers, folder names, and expected workspace paths. Read this before planning or implementing project changes. Takes only projectId. Contains no sessions, instances, or credentials. Missing overviews stay empty; this is saved context, not live code inspection.",
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
        return {
          project,
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
            instructions:
              "Enter the relevant repository, read its local instructions, and use the installed OpenCode CLI for code changes.",
          },
          contextSource:
            "Saved project and repository overviews; not a live filesystem inspection. Workspace paths describe the configured layout, not verified directories.",
        };
      }),
  );
}
