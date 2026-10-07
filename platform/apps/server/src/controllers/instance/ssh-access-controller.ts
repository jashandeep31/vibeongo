import {
  and,
  db,
  desc,
  eq,
  gt,
  instances,
  isNull,
  projectSessions,
  projects,
  sshAccessTokens,
} from "@repo/db";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";
import { getSshTerminalWebSocketGrant } from "../../services/instances/get-ssh-terminal-websocket-grant.js";

const ACCESS_LIFETIME_MS = 60 * 60 * 1000;
const accessTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const instanceParams = z.object({ id: z.uuid() });
const accessParams = instanceParams.extend({ accessId: z.uuid() });

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function assertInstanceOwner(instanceId: string, userId: string) {
  const [target] = await db
    .select({ archived: projectSessions.archived })
    .from(instances)
    .innerJoin(
      projectSessions,
      eq(projectSessions.id, instances.project_session_id),
    )
    .innerJoin(projects, eq(projects.id, projectSessions.project_id))
    .where(
      and(
        eq(instances.id, instanceId),
        eq(instances.user_id, userId),
        eq(instances.project_id, projects.id),
        eq(projectSessions.user_id, userId),
        eq(projects.user_id, userId),
        eq(projects.deleted, false),
      ),
    )
    .limit(1);
  if (!target) throw new AppError("Instance not found", 404);
  return target;
}

function accessStatus(
  access: {
    expiresAt: Date;
    revokedAt: Date | null;
    instanceState: string | null;
    instanceTerminatesAt: Date | null;
    sessionArchived: boolean;
  },
  now: Date,
) {
  if (access.revokedAt) return "revoked";
  if (access.expiresAt <= now) return "expired";
  if (
    access.sessionArchived ||
    access.instanceState !== "running" ||
    !access.instanceTerminatesAt ||
    access.instanceTerminatesAt <= now
  )
    return "instance_unavailable";
  return "active";
}

async function issueSshAccess(
  res: Response,
  userId: string,
  sessionId: string,
  instanceId: string,
  now: Date,
) {
  const token = randomBytes(32).toString("base64url");
  const [access] = await db
    .insert(sshAccessTokens)
    .values({
      token_hash: tokenHash(token),
      user_id: userId,
      project_session_id: sessionId,
      instance_id: instanceId,
      expires_at: new Date(now.getTime() + ACCESS_LIFETIME_MS),
    })
    .returning({
      id: sshAccessTokens.id,
      createdAt: sshAccessTokens.created_at,
      expiresAt: sshAccessTokens.expires_at,
    });
  if (!access) throw new AppError("Could not create SSH access", 500);
  res.set("Cache-Control", "no-store");
  res.status(201).json({
    id: access.id,
    username: token,
    host: env.SSH_GATEWAY_DOMAIN,
    port: env.SSH_GATEWAY_PORT,
    createdAt: access.createdAt,
    expiresAt: access.expiresAt,
  });
}

export const createSshAccess = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);
    const { id } = instanceParams.parse(req.params);
    const now = new Date();
    const [target] = await db
      .select({ sessionId: projectSessions.id })
      .from(instances)
      .innerJoin(
        projectSessions,
        eq(projectSessions.id, instances.project_session_id),
      )
      .innerJoin(projects, eq(projects.id, projectSessions.project_id))
      .where(
        and(
          eq(instances.id, id),
          eq(instances.user_id, user.id),
          eq(instances.project_id, projects.id),
          eq(instances.state, "running"),
          gt(instances.terminates_at, now),
          eq(projectSessions.user_id, user.id),
          eq(projectSessions.archived, false),
          eq(projects.user_id, user.id),
          eq(projects.deleted, false),
        ),
      )
      .limit(1);
    if (!target) throw new AppError("Running instance not found", 404);
    await issueSshAccess(res, user.id, target.sessionId, id, now);
  },
);

export const listSshAccess = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);
  const { id } = instanceParams.parse(req.params);
  const target = await assertInstanceOwner(id, user.id);
  const rows = await db
    .select({
      id: sshAccessTokens.id,
      instanceId: sshAccessTokens.instance_id,
      createdAt: sshAccessTokens.created_at,
      expiresAt: sshAccessTokens.expires_at,
      revokedAt: sshAccessTokens.revoked_at,
      lastUsedAt: sshAccessTokens.last_used_at,
      instanceState: instances.state,
      instanceTerminatesAt: instances.terminates_at,
    })
    .from(sshAccessTokens)
    .leftJoin(instances, eq(instances.id, sshAccessTokens.instance_id))
    .where(
      and(
        eq(sshAccessTokens.user_id, user.id),
        eq(sshAccessTokens.instance_id, id),
      ),
    )
    .orderBy(desc(sshAccessTokens.created_at));
  const now = new Date();
  res.set("Cache-Control", "no-store");
  res.json(
    rows.map(({ instanceState, instanceTerminatesAt, ...row }) => ({
      ...row,
      status: accessStatus(
        {
          ...row,
          instanceState,
          instanceTerminatesAt,
          sessionArchived: target.archived,
        },
        now,
      ),
    })),
  );
});

export const revokeSshAccess = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);
    const { id, accessId } = accessParams.parse(req.params);
    await assertInstanceOwner(id, user.id);
    const [existing] = await db
      .select({ id: sshAccessTokens.id, revokedAt: sshAccessTokens.revoked_at })
      .from(sshAccessTokens)
      .where(
        and(
          eq(sshAccessTokens.id, accessId),
          eq(sshAccessTokens.user_id, user.id),
          eq(sshAccessTokens.instance_id, id),
        ),
      )
      .limit(1);
    if (!existing) throw new AppError("SSH access not found", 404);
    if (!existing.revokedAt) {
      await db
        .update(sshAccessTokens)
        .set({ revoked_at: new Date() })
        .where(
          and(
            eq(sshAccessTokens.id, accessId),
            eq(sshAccessTokens.user_id, user.id),
            eq(sshAccessTokens.instance_id, id),
            isNull(sshAccessTokens.revoked_at),
          ),
        );
    }
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
