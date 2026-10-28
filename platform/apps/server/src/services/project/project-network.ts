import {
  and,
  db,
  eq,
  inArray,
  projectDomainRouting,
  projects,
  proxyDomains,
  routingAllowedIps,
} from "@repo/db";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { getProxyServerUrl } from "../../lib/proxy-servers.js";
import {
  invalidateProjectProxiesByPid,
  invalidateProxyHosts,
} from "../../lib/invalidate-project-proxies-by-pid.js";

// Match the existing web API: individual IPv4 addresses, not CIDR ranges.
export const projectAllowedIpSchema = z
  .string()
  .regex(
    /^(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})(?:\.(?!$)|$)){4}$/,
    "Enter a valid IPv4 address",
  );

export async function assertProjectOwner(userId: string, projectId: string) {
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.user_id, userId),
        eq(projects.deleted, false),
      ),
    )
    .limit(1);
  if (!project) throw new AppError("Project not found", 404);
  return project;
}

async function getOwnedRouting(userId: string, projectId: string) {
  await assertProjectOwner(userId, projectId);
  const [routing] = await db
    .select()
    .from(projectDomainRouting)
    .where(
      and(
        eq(projectDomainRouting.project_id, projectId),
        eq(projectDomainRouting.user_id, userId),
      ),
    )
    .limit(1);
  return routing;
}

async function requireRouting(userId: string, projectId: string) {
  const routing = await getOwnedRouting(userId, projectId);
  if (!routing) throw new AppError("routing not found", 404);
  return routing;
}

export async function getProjectDomainRoutingForUser(
  userId: string,
  projectId: string,
) {
  const routing = await getOwnedRouting(userId, projectId);
  if (!routing) return null;
  const [domains, ips] = await Promise.all([
    db
      .select()
      .from(proxyDomains)
      .where(
        and(
          eq(proxyDomains.routing_id, routing.id),
          eq(proxyDomains.user_id, userId),
        ),
      )
      .orderBy(proxyDomains.target_port, proxyDomains.domain),
    db
      .select()
      .from(routingAllowedIps)
      .where(eq(routingAllowedIps.routing_id, routing.id))
      .orderBy(routingAllowedIps.ip),
  ]);
  const postfix = domains.length ? await getProxyServerUrl(projectId) : "";
  return {
    ...routing,
    proxy_domains: domains.map((domain) => ({
      ...domain,
      domain: domain.domain + postfix,
    })),
    allowed_ips: ips,
  };
}

export async function getProjectNetworkSummary(
  userId: string,
  projectId: string,
) {
  const routing = await getProjectDomainRoutingForUser(userId, projectId);
  return {
    routingConfigured: routing !== null,
    domains: (routing?.proxy_domains ?? []).map((domain) => ({
      id: domain.id,
      domain: domain.domain,
      url: `https://${domain.domain}`,
      targetPort: domain.target_port,
      allowAllIps: domain.allow_all_ips,
      portEditable: domain.is_editable,
    })),
    allowedIps: (routing?.allowed_ips ?? []).map((ip) => ({
      id: ip.id,
      ip: ip.ip,
    })),
    accessPolicy:
      "Allowed IPs apply to the project's routing. Domains with allowAllIps=true bypass this IP allowlist; other service authentication may still apply.",
  };
}

export async function listProjectNetworks(
  userId: string,
  input: { projectId?: string | undefined; page: number; limit: number },
) {
  if (input.projectId) await assertProjectOwner(userId, input.projectId);
  const rows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(
      and(
        eq(projects.user_id, userId),
        eq(projects.deleted, false),
        input.projectId ? eq(projects.id, input.projectId) : undefined,
      ),
    )
    .orderBy(projects.id)
    .limit(input.limit + 1)
    .offset((input.page - 1) * input.limit);
  return {
    page: input.page,
    limit: input.limit,
    hasNext: rows.length > input.limit,
    projects: await Promise.all(
      rows.slice(0, input.limit).map(async (project) => ({
        projectId: project.id,
        projectName: project.name,
        ...(await getProjectNetworkSummary(userId, project.id)),
      })),
    ),
  };
}

export async function addProjectAllowedIp(
  userId: string,
  projectId: string,
  ip: string,
) {
  const validatedIp = projectAllowedIpSchema.parse(ip);
  const routing = await requireRouting(userId, projectId);
  // Retry-safe: adding an already allowed address does not create another row.
  const [added] = await db
    .insert(routingAllowedIps)
    .values({ ip: validatedIp, routing_id: routing.id })
    .onConflictDoNothing()
    .returning({ id: routingAllowedIps.id, ip: routingAllowedIps.ip });
  const [existing] = added
    ? [added]
    : await db
        .select({ id: routingAllowedIps.id, ip: routingAllowedIps.ip })
        .from(routingAllowedIps)
        .where(
          and(
            eq(routingAllowedIps.routing_id, routing.id),
            eq(routingAllowedIps.ip, validatedIp),
          ),
        )
        .limit(1);
  if (!existing) throw new AppError("Could not add allowed IP", 500);
  await invalidateProjectProxiesByPid(projectId);
  return existing;
}

export async function removeProjectAllowedIps(
  userId: string,
  projectId: string,
  ipIds: string[],
) {
  const routing = await requireRouting(userId, projectId);
  const removed = await db
    .delete(routingAllowedIps)
    .where(
      and(
        eq(routingAllowedIps.routing_id, routing.id),
        inArray(routingAllowedIps.id, ipIds),
      ),
    )
    .returning({ id: routingAllowedIps.id });
  await invalidateProjectProxiesByPid(projectId);
  return { removedIds: removed.map((row) => row.id) };
}

export async function updateProjectDomainForUser(
  userId: string,
  projectId: string,
  domainId: string,
  input: {
    target_port?: number | undefined;
    allow_all_ips?: boolean | undefined;
  },
) {
  if (input.target_port === undefined && input.allow_all_ips === undefined) {
    throw new AppError("Provide target_port or allow_all_ips", 400);
  }
  const routing = await requireRouting(userId, projectId);
  const [domain] = await db
    .select({ id: proxyDomains.id, isEditable: proxyDomains.is_editable })
    .from(proxyDomains)
    .where(
      and(
        eq(proxyDomains.id, domainId),
        eq(proxyDomains.user_id, userId),
        eq(proxyDomains.routing_id, routing.id),
      ),
    )
    .limit(1);
  if (!domain) throw new AppError("domain not found", 404);
  if (input.target_port !== undefined && !domain.isEditable)
    throw new AppError("domain port is not editable", 403);
  const [updated] = await db
    .update(proxyDomains)
    .set({
      ...(input.target_port !== undefined
        ? { target_port: input.target_port }
        : {}),
      ...(input.allow_all_ips !== undefined
        ? { allow_all_ips: input.allow_all_ips }
        : {}),
    })
    .where(
      and(
        eq(proxyDomains.id, domainId),
        eq(proxyDomains.user_id, userId),
        eq(proxyDomains.routing_id, routing.id),
      ),
    )
    .returning({
      id: proxyDomains.id,
      domain: proxyDomains.domain,
      targetPort: proxyDomains.target_port,
      allowAllIps: proxyDomains.allow_all_ips,
    });
  if (!updated) throw new AppError("domain not found", 404);
  await invalidateProxyHosts(projectId, [updated.domain]);
  return {
    id: updated.id,
    targetPort: updated.targetPort,
    allowAllIps: updated.allowAllIps,
  };
}
