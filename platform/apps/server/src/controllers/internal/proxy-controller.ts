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

    const [domainRouting] = result;
    const {
      proxy_domains: proxyDomain,
      instances: instance,
      sandbox_types: sandboxType,
      instance_types: instanceType,
    } = domainRouting ?? {};

    if (!proxyDomain || !instance) {
      res.status(404).json({
        message: "Domain not round ",
      });
      return;
    }

    const provider = sandboxType?.provider ?? instanceType?.provider;
    if (!provider) {
      throw new AppError("Instance provider not found", 404);
    }

    const proxy = {
      id: proxyDomain.id,
      domain: proxyDomain.domain,
      target_port: proxyDomain.target_port,
      allowed_all_ips: proxyDomain.allow_all_ips,
      target: await getProxyTargetUrl({
        provider,
        publicIp: instance.public_ip,
        targetPort: proxyDomain.target_port,
        providerInstanceId: instance.provider_instance_id,
      }),
      allowed_ips: result
        .map((r) => r.routing_allowed_ips?.ip)
        .filter((ip): ip is string => Boolean(ip)),
    };
    console.log(proxy);
    res.status(200).json({
      data: proxy,
    });
  },
);

type ProxyProvider =
  | (typeof sandboxProvidersEnums.enumValues)[number]
  | (typeof instanceProvidersEnum.enumValues)[number];

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
