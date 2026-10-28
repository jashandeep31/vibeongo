import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  changeManualSessionState,
  extendManualSessionTime,
  getSessionContext,
  resumeManualSession,
  runtimeSummary,
} from "../../services/project-sessions/session-runtime.js";
import { startManualSession } from "../../services/project-sessions/start-manual-session.js";
import type { McpUser } from "../create-server.js";
import { toolResult } from "../tool-result.js";
import { WORKSPACE_GUIDANCE } from "../workspace-guide.js";

const sessionInput = z
  .object({
    sessionId: z
      .uuid()
      .describe("Session ID from create_session or get_projects."),
  })
  .strict();
const instanceInput = sessionInput.extend({
  instanceId: z
    .uuid()
    .describe(
      "Exact instance ID from get_session_context. Must belong to this session.",
    ),
});
const runtime = z.enum(["vm", "sandbox"]);
const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export function registerSessionRuntimeTools(
  server: McpServer,
  user: McpUser,
): void {
  server.registerTool(
    "get_session_context",
    {
      description:
        "Read your session's project, description, overview, tasks, latest provisioning status, active instances, expiration, and remainingSeconds. Paused/terminated instances have zero running time remaining. Includes provider capabilities for pause and time extension. Runtime state does not guarantee setup is finished.",
      inputSchema: sessionInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ sessionId }) =>
      toolResult(async () => ({
        ...(await getSessionContext(user.id, sessionId)),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );

  server.registerTool(
    "spin_up_session",
    {
      description:
        "Start a fresh VM or sandbox for an existing manual session, using the same launch, wallet, tier capacity, and domain-routing checks as the web API. Runtime is required. Rejects sessions with a running, starting, or suspended instance; resume suspended instances with resume_session. Launch incurs normal runtime charges; setup continues after provisioning.",
      inputSchema: sessionInput.extend({ runtime }),
      annotations: writeAnnotations,
    },
    async ({ sessionId, runtime }) =>
      toolResult(async () => ({
        sessionId,
        status: "starting",
        instance: runtimeSummary(
          await startManualSession(user.id, sessionId, runtime),
        ),
        message:
          "Instance created; runtime setup may still be in progress. Check get_session_context before requesting SSH access.",
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );

  server.registerTool(
    "resume_session",
    {
      description:
        "Resume a manual session. A suspended E2B/Boat sandbox is resumed in place with its saved filesystem; runtime restart continues in the background. If there is no active instance, supply runtime to launch a fresh one using web API checks. A fresh instance does not restore a terminated instance's unsaved filesystem. Rejects running instances. Normal billing applies.",
      inputSchema: sessionInput.extend({ runtime: runtime.optional() }),
      annotations: writeAnnotations,
    },
    async ({ sessionId, runtime }) =>
      toolResult(async () => ({
        ...(await resumeManualSession(user.id, sessionId, runtime)),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );

  server.registerTool(
    "extend_session_time",
    {
      description:
        "Add whole minutes to the exact running, unexpired instance's existing expiration using the web API time-update service. Supports VMs and Boat sandboxes; Boat allows 1–120 minutes per request, subject to provider limits. Other sandboxes are unsupported. Supply a unique requestId per extension and reuse it with identical minutes when retrying that operation. Longer runtime incurs normal charges.",
      inputSchema: instanceInput.extend({
        timeInMinutes: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        requestId: z
          .string()
          .min(1)
          .max(100)
          .describe(
            "Unique ID for this extension. Reuse it with the same minutes for retries; use a new ID for the next extension.",
          ),
      }),
      annotations: writeAnnotations,
    },
    async (input) =>
      toolResult(async () => ({
        ...(await extendManualSessionTime(user.id, input)),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );

  server.registerTool(
    "pause_session",
    {
      description:
        "Pause the exact instance of your manual session using the web API lifecycle lock, billing, credential revocation, and queue handling. Only E2B/Boat sandboxes support pause; VMs and other providers cannot pause. A queued response means the pause is not yet complete. Resume later with resume_session; suspended storage charges may apply.",
      inputSchema: instanceInput,
      annotations: { ...writeAnnotations, idempotentHint: true },
    },
    async (input) =>
      toolResult(async () => ({
        ...(await changeManualSessionState(user.id, {
          ...input,
          action: "pause",
        })),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );

  server.registerTool(
    "terminate_session",
    {
      description:
        "Terminate the exact running or suspended instance of your manual session through the web API lifecycle and billing services. Unsaved instance files may be lost. Keeps the session record; a later spin-up is a fresh instance. A queued response means termination is not complete. Repeat termination of the same instance is safe.",
      inputSchema: instanceInput,
      annotations: {
        ...writeAnnotations,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    async (input) =>
      toolResult(async () => ({
        ...(await changeManualSessionState(user.id, {
          ...input,
          action: "terminate",
        })),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );
}
