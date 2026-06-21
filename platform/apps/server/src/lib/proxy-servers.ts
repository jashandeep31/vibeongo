import { db, eq, instanceRegions, instanceTypes, projects } from "@repo/db";
import { awsSupportedRegions } from "../aws/configs/aws-supported-regions-configs.js";
import { env } from "./env.js";
import { AppError } from "./app-error.js";

interface ProxyServerConfig {
  region: (typeof awsSupportedRegions)[number];
  domain: string;
}

const prodServers: ProxyServerConfig[] = [
  {
    region: "us-east-1",
    domain: ".vibeongo.one",
  },
  {
    region: "us-east-1",
    domain: ".in.vibeongo.one",
  },
];
const localServers: ProxyServerConfig[] = [
  {
    region: "us-east-1",
    domain: env.PROXY_DOMAIN,
  },
];

const proxyServers: ProxyServerConfig[] =
  env.NODE_ENV === "development" ? localServers : prodServers;

// NOTE: This is not the best way to get getProxyServerUrl
// we are using here project here to get the region id but user may have edited after lauching the instance which makes that instance to use this domain url
// but issue is not that big so ignoring it for now
export const getProxyServerUrl = async (
  project_id: string,
): Promise<string> => {
  const [row] = await db
    .select({ region: instanceRegions })
    .from(projects)
    .innerJoin(instanceTypes, eq(instanceTypes.id, projects.instance_type_id))
    .innerJoin(instanceRegions, eq(instanceRegions.id, instanceTypes.region_id))
    .where(eq(projects.id, project_id));
  if (!row) throw new AppError("region not found", 404);

  const server = localServers.find((i) => i.region === row.region.slug);

  if (server) {
    return server.domain;
  } else {
    return proxyServers[0]?.domain || "";
  }
};
