import { db, eq, projectDomainRouting, proxyDomains } from "@repo/db";
import axios from "axios";
import { env } from "./env.js";

export const invalidateProxyHosts = async (hosts: string[]) => {
  const uniqueHosts = [...new Set(hosts.filter(Boolean))];
  if (!uniqueHosts.length) return;

  await axios.post(
    `${env.PROXY_SERVER_URL}/proxy/invalidate`,
    {
      hosts: uniqueHosts,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PROXY_SERVER_TOKEN}`,
      },
    },
  );
};

export const invalidateProjectProxiesByRoutingId = async (
  routingId: string,
) => {
  const data = await db
    .select({
      domain: proxyDomains.domain,
    })
    .from(proxyDomains)
    .where(eq(proxyDomains.routing_id, routingId));

  await invalidateProxyHosts(data.map((d) => d.domain));
};

export const invalidateProjectProxiesByPid = async (pid: string) => {
  const data = await db
    .select({
      domain: proxyDomains.domain,
    })
    .from(proxyDomains)
    .innerJoin(
      projectDomainRouting,
      eq(projectDomainRouting.id, proxyDomains.routing_id),
    )
    .where(eq(projectDomainRouting.project_id, pid));

  await invalidateProxyHosts(data.map((d) => d.domain));
};
