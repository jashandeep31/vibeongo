import {
  and,
  db,
  eq,
  projectDomainRouting,
  proxyDomains,
  routingAllowedIps,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";

export const updateProxyDomainPort = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id, domainId, target_port } = z
      .object({
        id: z.string().uuid(),
        domainId: z.string().uuid(),
        target_port: z.coerce.number().int().min(1).max(65535),
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

    const updatedRows = await db
      .update(proxyDomains)
      .set({
        target_port,
      })
      .where(
        and(
          eq(proxyDomains.user_id, user.id),
          eq(proxyDomains.id, domainId),
          eq(proxyDomains.routing_id, projectRouting.id),
        ),
      )
      .returning({ id: proxyDomains.id });

    if (!updatedRows.length) throw new AppError("domain not found", 404);

    res.status(200).json({
      message: "port updated successfully",
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
      );

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

    res.status(200).json({
      message: "ip added to routing successfully",
    });
  },
);
