import { db, eq, projectDomainRouting, proxyDomains } from "@repo/db";
import axios from "axios";
import { env } from "./env.js";

export const invalidateProjectProxiesByPid = async (pid: string) => {
  const data = await db
    .select({
      domain: proxyDomains.domain,
    })
    .from(projectDomainRouting)
    .leftJoin(
      proxyDomains,
      eq(proxyDomains.routing_id, projectDomainRouting.id),
    )
    .where(eq(projectDomainRouting.project_id, pid));

  await axios.post(`${env.PROXY_SERVER_URL}/proxy/invalidate`, {
    hosts: data.map((d) => d.domain),
  });
};
