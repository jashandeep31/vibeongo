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
    const { id, port } = z
      .object({
        id: z.string(),
        port: z.number(),
      })
      .parse({ ...req.params, ...req.body });

    await db
      .update(proxyDomains)
      .set({
        target_port: port,
      })
      .where(and(eq(proxyDomains.user_id, user.id), eq(proxyDomains.id, id)));

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
        ip: z.string(),
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
