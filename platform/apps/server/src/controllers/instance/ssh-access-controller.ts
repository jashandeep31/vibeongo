import {
  and,
  db,
  eq,
  gt,
  instances,
  isNull,
  projectSessions,
  projects,
  sshAccessTokens,
} from "@repo/db";
import { timingSafeEqual } from "node:crypto";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";
import { getSshTerminalWebSocketGrant } from "../../services/instances/get-ssh-terminal-websocket-grant.js";
import {
  createSshAccessForUser,
  listSshAccessForUser,
  revokeSshAccessForUser,
  tokenHash,
} from "../../services/instances/ssh-access.js";

const accessTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const instanceParams = z.object({ id: z.uuid() });
const accessParams = instanceParams.extend({ accessId: z.uuid() });

export const createSshAccess = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Authentication is required", 401);
    const { id } = instanceParams.parse(req.params);
    const access = await createSshAccessForUser(req.user.id, id);
    res.set("Cache-Control", "no-store");
    res.status(201).json(access);
  },
);

export const listSshAccess = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication is required", 401);
  const { id } = instanceParams.parse(req.params);
  const accesses = await listSshAccessForUser(req.user.id, id);
  res.set("Cache-Control", "no-store");
  res.json(accesses);
});

export const revokeSshAccess = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Authentication is required", 401);
    const { id, accessId } = accessParams.parse(req.params);
    await revokeSshAccessForUser(req.user.id, id, accessId);
    res.set("Cache-Control", "no-store");
    res.status(204).end();
  },
);

export const authorizeSshAccess = catchAsync(
  async (req: Request, res: Response) => {
    if (!env.SSH_GATEWAY_TOKEN)
      throw new AppError("SSH gateway is not configured", 503);
    const supplied = req.get("authorization");
    const expected = `Bearer ${env.SSH_GATEWAY_TOKEN}`;
    if (
      !supplied ||
      supplied.length !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    )
      throw new AppError("Unauthorized", 401);

    const { token } = z.object({ token: accessTokenSchema }).parse(req.body);
    const now = new Date();
    const [target] = await db
      .select({
        accessId: sshAccessTokens.id,
        instanceId: instances.id,
        projectId: projects.id,
        config: instances.config,
        proxyAccessToken: instances.access_token,
      })
      .from(sshAccessTokens)
      .innerJoin(instances, eq(instances.id, sshAccessTokens.instance_id))
      .innerJoin(
        projectSessions,
        eq(projectSessions.id, sshAccessTokens.project_session_id),
      )
      .innerJoin(projects, eq(projects.id, projectSessions.project_id))
      .where(
        and(
          eq(sshAccessTokens.token_hash, tokenHash(token)),
          isNull(sshAccessTokens.revoked_at),
          gt(sshAccessTokens.expires_at, now),
          eq(instances.user_id, sshAccessTokens.user_id),
          eq(instances.project_session_id, sshAccessTokens.project_session_id),
          eq(instances.state, "running"),
          gt(instances.terminates_at, now),
          eq(projectSessions.user_id, sshAccessTokens.user_id),
          eq(projectSessions.archived, false),
          eq(projects.user_id, sshAccessTokens.user_id),
          eq(projects.deleted, false),
        ),
      )
      .limit(1);
    if (!target) throw new AppError("Invalid or expired SSH access", 401);

    const runtimeLocalToken =
      target.config &&
      typeof target.config === "object" &&
      !Array.isArray(target.config) &&
      "vibeongoLocalToken" in target.config &&
      typeof target.config.vibeongoLocalToken === "string"
        ? target.config.vibeongoLocalToken
        : null;
    if (!runtimeLocalToken)
      throw new AppError("SSH terminal credentials are unavailable", 409);

    const grant = await getSshTerminalWebSocketGrant({
      instanceId: target.instanceId,
      projectId: target.projectId,
      proxyAccessToken: target.proxyAccessToken,
      runtimeLocalToken,
    });
    const [stillAuthorized] = await db
      .update(sshAccessTokens)
      .set({ last_used_at: new Date() })
      .where(
        and(
          eq(sshAccessTokens.id, target.accessId),
          isNull(sshAccessTokens.revoked_at),
          gt(sshAccessTokens.expires_at, new Date()),
        ),
      )
      .returning({ id: sshAccessTokens.id });
    if (!stillAuthorized)
      throw new AppError("Invalid or expired SSH access", 401);
    res.set("Cache-Control", "no-store");
    res.status(200).json({ valid: true, ...grant });
  },
);
