import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  createSshAccessForUser,
  listSshAccessForUser,
  revokeSshAccessForUser,
} from "../../services/instances/ssh-access.js";
import type { McpUser } from "../create-server.js";
import { toolResult } from "../tool-result.js";
import { WORKSPACE_GUIDANCE, WORKSPACE_REMINDER } from "../workspace-guide.js";

const instanceInput = z
  .object({
    instanceId: z.uuid().describe("Instance ID returned by get_projects."),
  })
  .strict();

// Quote connection details as one shell argument, including configured hostnames.
const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export function registerSshTools(server: McpServer, user: McpUser): void {
  const createConnection = (instanceId: string) =>
    toolResult(async () => {
      const access = await createSshAccessForUser(user.id, instanceId);
      return {
        ...access,
        instanceId,
        workspaceGuidance: WORKSPACE_GUIDANCE,
        command: `ssh${access.port === 22 ? "" : ` -p ${access.port}`} ${shellQuote(`${access.username}@${access.host}`)}`,
        instructions:
          "Run the command in an SSH-capable terminal. The username is a temporary credential; no password is required. This gateway supports interactive shells only, not remote exec, SFTP, or port forwarding. This tool returns connection details; it does not open a terminal session.",
      };
    });

  server.registerTool(
    "create_ssh_access",
    {
      description: `Create temporary SSH access for one of your running instances. Returns the SSH command, credential, access ID, and expiry. Each call creates a new credential; keep it private and revoke it when finished. ${WORKSPACE_REMINDER}`,
      inputSchema: instanceInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ instanceId }) => createConnection(instanceId),
  );

  server.registerTool(
    "connect_ssh",
    {
      description: `Prepare an SSH connection to your running instance. Creates fresh temporary access and returns a command to run in a terminal. Does not execute SSH or maintain an interactive session inside MCP. ${WORKSPACE_REMINDER}`,
      inputSchema: instanceInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ instanceId }) => createConnection(instanceId),
  );

  server.registerTool(
    "list_ssh_access",
    {
      description: `List SSH access IDs, timestamps, and statuses for your instance. Existing plaintext credentials cannot be retrieved. ${WORKSPACE_REMINDER}`,
      inputSchema: instanceInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ instanceId }) =>
      toolResult(async () => ({
        instanceId,
        workspaceGuidance: WORKSPACE_GUIDANCE,
        accesses: await listSshAccessForUser(user.id, instanceId),
      })),
  );

  server.registerTool(
    "revoke_ssh_access",
    {
      description: `Revoke an SSH access ID belonging to your instance, preventing new connections with that credential. Repeating revocation is safe. Existing SSH connections are not forcibly disconnected. ${WORKSPACE_REMINDER}`,
      inputSchema: instanceInput.extend({
        accessId: z
          .uuid()
          .describe(
            "Access ID from create_ssh_access, connect_ssh, or list_ssh_access.",
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ instanceId, accessId }) =>
      toolResult(async () => {
        await revokeSshAccessForUser(user.id, instanceId, accessId);
        return {
          instanceId,
          accessId,
          revoked: true,
          workspaceGuidance: WORKSPACE_GUIDANCE,
        };
      }),
  );
}
