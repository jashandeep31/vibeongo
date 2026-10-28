import { and, db, eq, instances, projectDomainRouting } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { invalidateProjectProxiesByPid } from "../../lib/invalidate-project-proxies-by-pid.js";

import {
  addProjectAllowedIp,
  removeProjectAllowedIps,
  updateProjectDomainForUser,
  projectAllowedIpSchema,
} from "../../services/project/project-network.js";

export const updateProxyDomain = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("authentication is required", 401);
    const { id, domainId, ...input } = z
      .object({
        id: z.uuid(),
        domainId: z.uuid(),
        target_port: z.coerce.number().int().min(1).max(65535).optional(),
        allow_all_ips: z.boolean().optional(),
      })
      .parse({ ...req.params, ...req.body });
    await updateProjectDomainForUser(req.user.id, id, domainId, input);
    res.status(200).json({ message: "domain updated successfully" });
  },
);

export const deleteMultipleIpFromProject = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("authentication is required", 401);
    const { id, ids } = z
      .object({ id: z.uuid(), ids: z.array(z.uuid()).min(1) })
      .parse({ ...req.params, ...req.body });
    await removeProjectAllowedIps(req.user.id, id, ids);
    res.status(200).json({ message: "ips removed from routing successfully" });
  },
);

export const deleteAllowedIPFromProject = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("authentication is required", 401);
    const { id, ipId } = z
      .object({ id: z.string(), ipId: z.string() })
      .parse(req.params);
    await removeProjectAllowedIps(req.user.id, id, [ipId]);
    res.status(200).json({ message: "ip removed from routing successfully" });
  },
);

export const addAllowedIPToProject = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("authentication is required", 401);
    const { id, ip } = z
      .object({ id: z.string(), ip: projectAllowedIpSchema })
      .parse({ ...req.params, ...req.body });
    await addProjectAllowedIp(req.user.id, id, ip);
    res.status(200).json({ message: "ip added to routing successfully" });
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
