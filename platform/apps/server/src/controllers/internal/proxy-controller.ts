import {
  db,
  eq,
  getTableColumns,
  instances,
  projectDomainRouting,
  proxyDomains,
  routingAllowedIps,
  sql,
} from "@repo/db";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";

export const getTargetHostByDomain = catchAsync(
  async (req: Request, res: Response) => {
    const authToken = req.headers.authorization;
    if (authToken !== env.PROXY_SERVER_TOKEN) {
      throw new AppError("unauthorized", 401);
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
      .leftJoin(
        routingAllowedIps,
        eq(routingAllowedIps.routing_id, projectDomainRouting.id),
      )
      .where(eq(proxyDomains.domain, subdomain));

    const first = result[0];
    if (!first || !first.proxy_domains || !first.instances) {
      res.status(404).json({
        message: "Domain not round ",
      });
      return;
    }
    const proxy = {
      id: first.proxy_domains.id,
      domain: first.proxy_domains.domain,
      target_port: first.proxy_domains.target_port,
      allowed_all_ips: first.proxy_domains.allow_all_ips,
      target:
        first.instances.runtime_kind === "sandbox"
          ? "https://" + first.instances.public_ip
          : "http://" +
            first.instances.public_ip +
            ":" +
            first.proxy_domains.target_port,
      allowed_ips: result
        .map((r) => (r.routing_allowed_ips ? r.routing_allowed_ips.ip : null))
        .filter(Boolean),
    };
    if (!proxy) {
      res.status(404).json({
        message: "Domain not round ",
      });
      return;
    }
    console.log(proxy);
    res.status(200).json({
      data: proxy,
    });
  },
);
