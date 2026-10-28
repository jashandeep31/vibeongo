import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  addProjectAllowedIp,
  getProjectNetworkSummary,
  listProjectNetworks,
  projectAllowedIpSchema,
  removeProjectAllowedIps,
  updateProjectDomainForUser,
} from "../../services/project/project-network.js";
import { getProjectContainers } from "../../services/project/get-project-containers.js";
import type { McpUser } from "../create-server.js";
import { toolResult } from "../tool-result.js";
import { WORKSPACE_GUIDANCE } from "../workspace-guide.js";

const projectInput = z.object({ projectId: z.uuid() }).strict();
const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const writeAnnotations = { ...readAnnotations, readOnlyHint: false };

export function registerProjectNetworkTools(
  server: McpServer,
  user: McpUser,
): void {
  server.registerTool(
    "list_domains",
    {
      description:
        "List all your projects' domains with full URLs, target ports, domain access settings, and project-wide allowed IPs. Optionally filter by projectId. Results are paginated by project; follow hasNext to list everything. Does not grant access or expose credentials.",
      inputSchema: z
        .object({
          projectId: z.uuid().optional(),
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(15),
        })
        .strict(),
      annotations: readAnnotations,
    },
    async (input) =>
      toolResult(async () => ({
        ...(await listProjectNetworks(user.id, input)),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );

  server.registerTool(
    "list_allowed_ips",
    {
      description:
        "List all IPv4 addresses allowed for this project's routing, with IDs needed for removal and each domain's allowAllIps setting. IPs apply project-wide; allowAllIps=true bypasses the IP list for that domain.",
      inputSchema: projectInput,
      annotations: readAnnotations,
    },
    async ({ projectId }) =>
      toolResult(async () => {
        const network = await getProjectNetworkSummary(user.id, projectId);
        return { projectId, ...network, workspaceGuidance: WORKSPACE_GUIDANCE };
      }),
  );

  server.registerTool(
    "add_allowed_ip",
    {
      description:
        "Allow an explicit IPv4 address to access your project's routing, matching the web API. This changes project-wide access; do not assume a cloud agent's IP is the user's IP. Existing addresses are returned without duplication. CIDR ranges and IPv6 are not supported.",
      inputSchema: projectInput.extend({ ip: projectAllowedIpSchema }),
      annotations: writeAnnotations,
    },
    async ({ projectId, ip }) =>
      toolResult(async () => ({
        projectId,
        allowedIp: await addProjectAllowedIp(user.id, projectId, ip),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );

  server.registerTool(
    "remove_allowed_ips",
    {
      description:
        "Remove one or more allowed IPv4 entries from your project's routing using IDs from list_allowed_ips. Only entries belonging to this project's routing can be removed. May remove access for those clients; repeated removal is safe. Domains with allowAllIps=true remain open to all IPs.",
      inputSchema: projectInput.extend({
        ipIds: z.array(z.uuid()).min(1).max(100),
      }),
      annotations: { ...writeAnnotations, destructiveHint: true },
    },
    async ({ projectId, ipIds }) =>
      toolResult(async () => ({
        projectId,
        ...(await removeProjectAllowedIps(user.id, projectId, ipIds)),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );

  server.registerTool(
    "update_domain",
    {
      description:
        "Update your project's domain using the same port-editability checks and proxy cache invalidation as the web API. allowAllIps=true opens this domain to all source IPs; false restores the project IP allowlist. This changes network exposure, not other service authentication. Only editable domain ports may be changed. Supply targetPort or allowAllIps.",
      inputSchema: projectInput
        .extend({
          domainId: z.uuid(),
          targetPort: z.number().int().min(1).max(65535).optional(),
          allowAllIps: z.boolean().optional(),
        })
        .refine(
          (input) =>
            input.targetPort !== undefined || input.allowAllIps !== undefined,
          "Provide targetPort or allowAllIps",
        ),
      annotations: { ...writeAnnotations, destructiveHint: true },
    },
    async ({ projectId, domainId, targetPort, allowAllIps }) =>
      toolResult(async () => ({
        projectId,
        domain: await updateProjectDomainForUser(user.id, projectId, domainId, {
          target_port: targetPort,
          allow_all_ips: allowAllIps,
        }),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );

  server.registerTool(
    "list_containers",
    {
      description:
        "List container names and project ports from your saved Docker project configuration. This is configured inventory, not live container status or a verified container-to-port mapping. Do not expose raw Compose content. Use OpenCode CLI inside the project session sandbox for container-related project changes.",
      inputSchema: projectInput,
      annotations: readAnnotations,
    },
    async ({ projectId }) =>
      toolResult(async () => ({
        projectId,
        ...(await getProjectContainers(user.id, projectId)),
        workspaceGuidance: WORKSPACE_GUIDANCE,
      })),
  );
}
