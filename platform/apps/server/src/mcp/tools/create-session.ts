import type { McpServer } from "@modelcontextprotocol/server";
import {
  createManualProjectSession,
  createManualSessionSchema,
} from "../../services/project-sessions/create-manual-session.js";
import type { McpUser } from "../create-server.js";
import { toolResult } from "../tool-result.js";
import { WORKSPACE_GUIDANCE } from "../workspace-guide.js";

export function registerCreateSessionTool(
  server: McpServer,
  user: McpUser,
): void {
  server.registerTool(
    "create_session",
    {
      description:
        "Create a manual session under one of your projects. Requires projectId, sessionName (4–50 characters), and an optional sessionDescription. A project may have at most 8 unarchived sessions. This creates the session record only; it does not start an instance or run tasks. Category is always manual.",
      inputSchema: createManualSessionSchema.strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      toolResult(async () => {
        const session = await createManualProjectSession(user.id, input);
        return {
          message: "Successfully created the manual project session",
          session: {
            id: session.id,
            projectId: session.project_id,
            name: session.name,
            description: session.description,
            category: session.category,
            archived: session.archived,
            createdAt: session.created_at,
          },
          instanceStarted: false,
          workspaceGuidance: WORKSPACE_GUIDANCE,
        };
      }),
  );
}
