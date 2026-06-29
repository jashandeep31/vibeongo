import {
  and,
  db,
  eq,
  inArray,
  instances,
  projectDomainRouting,
  proxyDomains,
  routingAllowedIps,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import {
  invalidateProjectProxiesByPid,
  invalidateProxyHosts,
} from "../../lib/invalidate-project-proxies-by-pid.js";

export const updateProxyDomain = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const {
      id: projectId,
      domainId,
      target_port,
      allow_all_ips,
    } = z
      .object({
        id: z.uuid(),
        domainId: z.uuid(),
        target_port: z.coerce.number().int().min(1).max(65535).optional(),
        allow_all_ips: z.boolean().optional(),
      })
      .parse({ ...req.params, ...req.body });

    const [projectRouting] = await db
      .select({
        routingId: projectDomainRouting.id,
        domainId: proxyDomains.id,
        domain: proxyDomains.domain,
        isEditable: proxyDomains.is_editable,
      })
      .from(projectDomainRouting)
      .leftJoin(
        proxyDomains,
        and(
          eq(proxyDomains.id, domainId),
          eq(proxyDomains.user_id, user.id),
          eq(proxyDomains.routing_id, projectDomainRouting.id),
        ),
      )
      .where(
        and(
          eq(projectDomainRouting.user_id, user.id),
          eq(projectDomainRouting.project_id, projectId),
        ),
      );
    if (!projectRouting) throw new AppError("routing not found", 404);
    if (!projectRouting.domainId || !projectRouting.domain) {
      throw new AppError("domain not found", 404);
    }

    if (target_port !== undefined && !projectRouting.isEditable) {
      throw new AppError("domain port is not editable", 403);
    }
    const updatedRows = await db
      .update(proxyDomains)
      .set({
        ...(target_port !== undefined ? { target_port } : {}),
        ...(allow_all_ips !== undefined ? { allow_all_ips } : {}),
      })
      .where(
        and(
          eq(proxyDomains.user_id, user.id),
          eq(proxyDomains.id, domainId),
          eq(proxyDomains.routing_id, projectRouting.routingId),
        ),
      )
      .returning({ id: proxyDomains.id, domain: proxyDomains.domain });

    if (!updatedRows.length) throw new AppError("domain not found", 404);

    await invalidateProxyHosts(
      projectId,
      updatedRows.map((row) => row.domain),
    );

    res.status(200).json({
      message: "domain updated successfully",
    });
  },
);

export const deleteMultipleIpFromProject = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);
    const { id, ids } = z
      .object({
        id: z.uuid(),
        ids: z.array(z.uuid()).min(1),
      })
      .parse({ ...req.params, ...req.body });

    const [projectRouting] = await db
      .select()
      .from(projectDomainRouting)
      .where(
        and(
          eq(projectDomainRouting.user_id, user.id),
          eq(projectDomainRouting.project_id, id),
        ),
      );

    if (!projectRouting) throw new AppError("routing not found", 404);

    await db
      .delete(routingAllowedIps)
      .where(
        and(
          eq(routingAllowedIps.routing_id, projectRouting.id),
          inArray(routingAllowedIps.id, ids),
        ),
      );

    await invalidateProjectProxiesByPid(projectRouting.project_id);

    res.status(200).json({
      message: "ips removed from routing successfully",
    });
  },
);

export const deleteAllowedIPFromProject = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);
    const { id, ipId } = z
      .object({
        id: z.string(),
        ipId: z.string(),
      })
      .parse({ ...req.params });

    const [projectRouting] = await db
      .select()
      .from(projectDomainRouting)
      .where(
        and(
          eq(projectDomainRouting.user_id, user.id),
          eq(projectDomainRouting.project_id, id),
        ),
      );

    if (!projectRouting) throw new AppError("routing not found", 404);

    await db
      .delete(routingAllowedIps)
      .where(
        and(
          eq(routingAllowedIps.id, ipId),
          eq(routingAllowedIps.routing_id, projectRouting.id),
        ),
      )
      .returning({ id: routingAllowedIps.id });

    await invalidateProjectProxiesByPid(projectRouting.project_id);

    res.status(200).json({
      message: "ip removed from routing successfully",
    });
  },
);
export const addAllowedIPToProject = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id, ip } = z
      .object({
        id: z.string(),
        ip: z
          .string()
          .regex(/^(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})(?:\.(?!$)|$)){4}$/),
      })
      .parse({ ...req.params, ...req.body });

    const [projectRouting] = await db
      .select()
      .from(projectDomainRouting)
      .where(
        and(
          eq(projectDomainRouting.user_id, user.id),
          eq(projectDomainRouting.project_id, id),
        ),
      );

    if (!projectRouting) throw new AppError("routing not found", 404);
    await db.insert(routingAllowedIps).values({
      ip,
      routing_id: projectRouting.id,
    });

    await invalidateProjectProxiesByPid(projectRouting.project_id);

    res.status(200).json({
      message: "ip added to routing successfully",
    });
  },
);

export const updateProjectRoutingTargetInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);
    const { id: ProjectId, instanceId } = z
      .object({
        id: z.string(),
        instanceId: z.string(),
      })
      .parse({ ...req.params, ...req.body });

    const [instance] = await db
      .select()
      .from(instances)
      .where(
        and(
          eq(instances.id, instanceId),
          eq(instances.state, "running"),
          eq(instances.user_id, user.id),
        ),
      );

    if (!instance) throw new AppError("instance not found", 404);
    const [updatedRouting] = await db
      .update(projectDomainRouting)
      .set({
        target_instance_id: instance.id,
      })
      .where(
        and(
          eq(projectDomainRouting.user_id, user.id),
          eq(projectDomainRouting.project_id, ProjectId),
        ),
      )
      .returning();
    if (!updatedRouting) throw new AppError("routing not found", 404);

    await invalidateProjectProxiesByPid(updatedRouting.project_id);

    res.status(200).json({
      message: "instance updated successfully",
    });
  },
);
