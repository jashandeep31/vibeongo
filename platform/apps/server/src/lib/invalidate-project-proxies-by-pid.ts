import { db, eq, projectDomainRouting, proxyDomains } from "@repo/db";
import axios from "axios";
import { env } from "./env.js";
import { getProxyServerUrl } from "./proxy-servers.js";

export const invalidateProxyHosts = async (pid: string, hosts: string[]) => {
  const uniqueHosts = [...new Set(hosts.filter(Boolean))];
  if (!uniqueHosts.length) return;
  const domain = await getProxyServerUrl(pid);

  await axios.post(
    `https://a${domain}/proxy/invalidate`,
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

  await invalidateProxyHosts(
    pid,
    data.map((d) => d.domain),
  );
};
