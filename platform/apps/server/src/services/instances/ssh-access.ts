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
import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";

const ACCESS_LIFETIME_MS = 60 * 60 * 1000;

export function tokenHash(token: string): string {
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
  return {
    id: access.id,
    username: token,
    host: env.SSH_GATEWAY_DOMAIN,
    port: env.SSH_GATEWAY_PORT,
    createdAt: access.createdAt,
    expiresAt: access.expiresAt,
  };
}

export async function createSshAccessForUser(
  userId: string,
  instanceId: string,
) {
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
        eq(instances.id, instanceId),
        eq(instances.user_id, userId),
        eq(instances.project_id, projects.id),
        eq(instances.state, "running"),
        gt(instances.terminates_at, now),
        eq(projectSessions.user_id, userId),
        eq(projectSessions.archived, false),
        eq(projects.user_id, userId),
        eq(projects.deleted, false),
      ),
    )
    .limit(1);
  if (!target) throw new AppError("Running instance not found", 404);
  return issueSshAccess(userId, target.sessionId, instanceId, now);
}
export async function listSshAccessForUser(userId: string, instanceId: string) {
  const target = await assertInstanceOwner(instanceId, userId);
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
        eq(sshAccessTokens.user_id, userId),
        eq(sshAccessTokens.instance_id, instanceId),
      ),
    )
    .orderBy(desc(sshAccessTokens.created_at));
  const now = new Date();
  return rows.map(({ instanceState, instanceTerminatesAt, ...row }) => ({
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
  }));
}
export async function revokeSshAccessForUser(
  userId: string,
  instanceId: string,
  accessId: string,
) {
  await assertInstanceOwner(instanceId, userId);
  const [existing] = await db
    .select({ id: sshAccessTokens.id, revokedAt: sshAccessTokens.revoked_at })
    .from(sshAccessTokens)
    .where(
      and(
        eq(sshAccessTokens.id, accessId),
        eq(sshAccessTokens.user_id, userId),
        eq(sshAccessTokens.instance_id, instanceId),
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
          eq(sshAccessTokens.user_id, userId),
          eq(sshAccessTokens.instance_id, instanceId),
          isNull(sshAccessTokens.revoked_at),
        ),
      );
  }
}
