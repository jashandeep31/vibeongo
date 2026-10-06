import { and, db, desc, eq, gt, instances, projectSessions, projects } from "@repo/db";
import { timingSafeEqual } from "node:crypto";
import { Request, Response } from "express";
import { z } from "zod";
import { consumeSshTicket, createSshTicket } from "../../cache/ssh-ticket-cache.js";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";
import { getSshTerminalWebSocketGrant } from "../../services/instances/get-ssh-terminal-websocket-grant.js";

const ticketSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const issueSshTicket = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const { id } = z.object({ id: z.uuid() }).parse(req.params);
  const [target] = await db
    .select({ instanceId: instances.id })
    .from(projectSessions)
    .innerJoin(projects, eq(projects.id, projectSessions.project_id))
    .innerJoin(instances, eq(instances.project_session_id, projectSessions.id))
    .where(
      and(
        eq(projectSessions.id, id),
        eq(projectSessions.user_id, user.id),
        eq(projectSessions.archived, false),
        eq(projects.user_id, user.id),
        eq(projects.deleted, false),
        eq(instances.user_id, user.id),
        eq(instances.state, "running"),
        gt(instances.terminates_at, new Date()),
      ),
    )
    .orderBy(desc(instances.started_at))
    .limit(1);

  if (!target) throw new AppError("Active project session not found", 404);

  const { ticket, expiresAt } = await createSshTicket({
    userId: user.id,
    projectSessionId: id,
    instanceId: target.instanceId,
  });
  res.set("Cache-Control", "no-store");
  res.status(201).json({
    ticket,
    expiresAt,
    username: ticket,
    host: env.SSH_GATEWAY_DOMAIN,
    port: env.SSH_GATEWAY_PORT,
  });
});

export const redeemSshTicket = catchAsync(async (req: Request, res: Response) => {
  if (!env.SSH_GATEWAY_TOKEN) {
    throw new AppError("SSH gateway is not configured", 503);
  }
  const supplied = req.get("authorization");
  const expected = `Bearer ${env.SSH_GATEWAY_TOKEN}`;
  if (
    !supplied ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  ) {
    throw new AppError("Unauthorized", 401);
  }

  const { ticket } = z.object({ ticket: ticketSchema }).parse(req.body);
  const target = await consumeSshTicket(ticket);
  if (!target) throw new AppError("Invalid or expired SSH ticket", 401);

  const [instance] = await db
    .select({
      id: instances.id,
      projectId: projects.id,
      config: instances.config,
      proxyAccessToken: instances.access_token,
    })
    .from(instances)
    .innerJoin(
      projectSessions,
      eq(projectSessions.id, instances.project_session_id),
    )
    .innerJoin(projects, eq(projects.id, projectSessions.project_id))
    .where(
      and(
        eq(instances.id, target.instanceId),
        eq(instances.user_id, target.userId),
        eq(instances.project_session_id, target.projectSessionId),
        eq(instances.state, "running"),
        gt(instances.terminates_at, new Date()),
        eq(projectSessions.user_id, target.userId),
        eq(projectSessions.archived, false),
        eq(projects.user_id, target.userId),
        eq(projects.deleted, false),
      ),
    )
    .limit(1);
  if (!instance) throw new AppError("SSH target is no longer available", 409);

  const runtimeLocalToken =
    instance.config &&
    typeof instance.config === "object" &&
    !Array.isArray(instance.config) &&
    "vibeongoLocalToken" in instance.config &&
    typeof instance.config.vibeongoLocalToken === "string"
      ? instance.config.vibeongoLocalToken
      : null;
  if (!runtimeLocalToken) {
    throw new AppError("SSH terminal credentials are unavailable", 409);
  }

  const grant = await getSshTerminalWebSocketGrant({
    instanceId: instance.id,
    projectId: instance.projectId,
    proxyAccessToken: instance.proxyAccessToken,
    runtimeLocalToken,
  });

  res.set("Cache-Control", "no-store");
  res.status(200).json({ valid: true, ...target, ...grant });
});
