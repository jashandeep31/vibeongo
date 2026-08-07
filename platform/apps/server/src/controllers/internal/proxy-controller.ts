import {
  db,
  eq,
  instanceProvidersEnum,
  instanceTypes,
  instances,
  projectDomainRouting,
  proxyDomains,
  routingAllowedIps,
  sandboxProvidersEnums,
  sandboxTypes,
} from "@repo/db";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import { DaytonaClient } from "../../providers/client/daytona-client.js";
import { E2BClient } from "../../providers/client/e2b-client.js";
import { VercelSandboxClient } from "../../providers/client/vercel-sandbox-client.js";

const daytonaClient = new DaytonaClient();
const e2bClient = new E2BClient();
const vercelClient = new VercelSandboxClient();

// current regex can accepts all domains. needs to fix it
// depending upon the future needs
const instanceUrlRegex =
  /^(?:https?:\/\/)?([1-9]\d{0,3}|[1-5]\d{4}|65535)-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})(?:\.[a-zA-Z0-9-]+)+\/?$/;

export const getTargetHostByDomain = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.headers.authorization) {
      throw new AppError("authorization token is required ", 401);
    }
    if (req.headers.authorization !== env.PROXY_SERVER_TOKEN) {
      throw new AppError("authorization token is not valid ", 401);
    }

    const { domain } = z
      .object({
        domain: z.string(),
      })
      .parse(req.body);

    const match = domain.match(instanceUrlRegex);
    if (match) {
      return handleInstanceProxyUrl({
        domain,
        port: Number(match[1]),
        instanceId: match[2]!,
        res,
      });
    }

    return handleCustomProxyUrl(domain, res);
  },
);

type InstanceProxyUrlOptions = {
  domain: string;
  port: number;
  instanceId: string;
  res: Response;
};

async function handleInstanceProxyUrl({
  domain,
  port,
  instanceId,
  res,
}: InstanceProxyUrlOptions) {
  const result = await db
    .select()
    .from(instances)
    .leftJoin(
      projectDomainRouting,
      eq(projectDomainRouting.project_id, instances.project_id),
    )
    .leftJoin(sandboxTypes, eq(sandboxTypes.id, instances.sandbox_type_id))
    .leftJoin(instanceTypes, eq(instanceTypes.id, instances.instance_type_id))
    .leftJoin(
      routingAllowedIps,
      eq(routingAllowedIps.routing_id, projectDomainRouting.id),
    )
    .where(eq(instances.id, instanceId));

  const [row] = result;
  if (!row?.instances) {
    res.status(404).json({ message: "Instance not found" });
    return;
  }

  return sendProxyResponse(res, {
    id: crypto.randomUUID(),
    domain,
    targetPort: port,
    allowAllIps: false,
    instance: row.instances,
    provider: row.sandbox_types?.provider ?? row.instance_types?.provider,
    allowedIps: collectAllowedIps(result),
  });
}

// Handles custom URLs such as randomID.vibeongo.one.
async function handleCustomProxyUrl(domain: string, res: Response) {
  const subdomain = domain.split(".")[0];

  if (!subdomain) throw new AppError("Domain is not valid", 400);

  const result = await db
    .select()
    .from(proxyDomains)
    .leftJoin(
      projectDomainRouting,
      eq(projectDomainRouting.id, proxyDomains.routing_id),
    )
    .innerJoin(
      instances,
      eq(instances.id, projectDomainRouting.target_instance_id),
    )
    .leftJoin(sandboxTypes, eq(sandboxTypes.id, instances.sandbox_type_id))
    .leftJoin(instanceTypes, eq(instanceTypes.id, instances.instance_type_id))
    .leftJoin(
      routingAllowedIps,
      eq(routingAllowedIps.routing_id, projectDomainRouting.id),
    )
    .where(eq(proxyDomains.domain, subdomain));

  const [row] = result;
  const proxyDomain = row?.proxy_domains;
  const instance = row?.instances;

  if (!proxyDomain || !instance) {
    res.status(404).json({
      message: "Domain not found",
    });
    return;
  }

  return sendProxyResponse(res, {
    id: proxyDomain.id,
    domain: proxyDomain.domain,
    targetPort: proxyDomain.target_port,
    allowAllIps: proxyDomain.allow_all_ips,
    instance,
    provider: row.sandbox_types?.provider ?? row.instance_types?.provider,
    allowedIps: collectAllowedIps(result),
  });
}

type ProxyProvider =
  | (typeof sandboxProvidersEnums.enumValues)[number]
  | (typeof instanceProvidersEnum.enumValues)[number];

type ProxyResponseOptions = {
  id: string;
  domain: string;
  targetPort: number;
  allowAllIps: boolean;
  instance: typeof instances.$inferSelect;
  provider: ProxyProvider | null | undefined;
  allowedIps: string[];
};

function collectAllowedIps(
  rows: { routing_allowed_ips: { ip: string } | null }[],
) {
  return rows
    .map((row) => row.routing_allowed_ips?.ip)
    .filter((ip): ip is string => Boolean(ip));
}

async function sendProxyResponse(res: Response, options: ProxyResponseOptions) {
  if (!options.provider) {
    throw new AppError("Instance provider not found", 404);
  }

  const target = await getProxyTargetUrl({
    provider: options.provider,
    publicIp: options.instance.public_ip,
    targetPort: options.targetPort,
    providerInstanceId: options.instance.provider_instance_id,
  });

  res.status(200).json({
    data: {
      id: options.id,
      domain: options.domain,
      target_port: options.targetPort,
      allowed_all_ips: options.allowAllIps,
      target,
      allowed_ips: options.allowedIps,
    },
  });
}

type ProxyTargetOptions = {
  publicIp: string | null;
  targetPort: number;
  providerInstanceId: string;
  provider: ProxyProvider;
};

type ProxyTargetResponse = {
  targetUrl: string;
  token: string;
  provider: ProxyProvider;
};

async function getProxyTargetUrl(
  options: ProxyTargetOptions,
): Promise<ProxyTargetResponse> {
  switch (options.provider) {
    case "e2b":
      return handleE2BClientProxyUrl(options);
    case "daytona":
      return handleDaytonaClientProxyUrl(options);
    case "vercel":
      return handleVercelClientProxyUrl(options);
    case "aws":
      return handleEC2ClientProxyUrl(options);
    case "digitalocean":
      return handleDigitalOceanClientProxyUrl(options);
  }
}

async function handleE2BClientProxyUrl({
  publicIp,
  targetPort,
  providerInstanceId,
  provider,
}: ProxyTargetOptions): Promise<ProxyTargetResponse> {
  const domain = publicIp?.split("-").slice(1).join("-");
  const token = await e2bClient.getPreviewToken({
    sandboxId: providerInstanceId,
  });
  return {
    targetUrl: `https://${targetPort}-${domain}`,
    token,
    provider,
  };
}

async function handleDaytonaClientProxyUrl({
  targetPort,
  providerInstanceId,
  provider,
}: ProxyTargetOptions): Promise<ProxyTargetResponse> {
  const signedUrl = await daytonaClient.getSignedPreviewUrl({
    sandboxId: providerInstanceId,
    port: targetPort,
    expiresInSeconds: 60 * 5,
  });

  return {
    targetUrl: signedUrl.url,
    token: signedUrl.token,
    provider,
  };
}

async function handleVercelClientProxyUrl({
  targetPort,
  providerInstanceId,
  provider,
}: ProxyTargetOptions): Promise<ProxyTargetResponse> {
  const targetUrl = await vercelClient.getPreviewUrl({
    sandboxId: providerInstanceId,
    port: targetPort,
  });

  return {
    targetUrl,
    token: "",
    provider,
  };
}

async function handleEC2ClientProxyUrl({
  publicIp,
  targetPort,
  provider,
}: ProxyTargetOptions): Promise<ProxyTargetResponse> {
  return {
    targetUrl: `http://${publicIp}:${targetPort}`,
    token: "",
    provider,
  };
}

async function handleDigitalOceanClientProxyUrl({
  publicIp,
  targetPort,
  provider,
}: ProxyTargetOptions): Promise<ProxyTargetResponse> {
  return {
    targetUrl: `http://${publicIp}:${targetPort}`,
    token: "",
    provider,
  };
}
