import { findAuthorizedUser } from "../../middlewares/check-authorization.js";
import crypto from "node:crypto";
import axios from "axios";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { z } from "zod";
import { accounts, and, db, eq } from "@repo/db";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import { redis } from "../../lib/valkey.js";
import { findWebSession } from "../../lib/auth-session.js";
import {
  connectGithubIdentity,
  type GithubIdentity,
} from "../../services/auth/github-connection.js";
import { toPublicUser } from "../../services/auth/password-auth.js";

const digest = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
const key = (kind: string, value: string) =>
  `github_connect:${kind}:${digest(value)}`;
const callbackUri = () => `${env.BACKEND_URL}/api/v1/auth/github/callback`;
type ConnectionRequest = {
  userId: string;
  clientType: "web" | "mobile";
  sessionHash?: string;
  state?: string;
  codeChallenge?: string;
};
const startSchema = z.discriminatedUnion("clientType", [
  z.object({ clientType: z.literal("web") }),
  z.object({
    clientType: z.literal("mobile"),
    state: z.string().min(10).max(256),
    codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  }),
]);

export const githubConnectionStatus = catchAsync(
  async (req: Request, res: Response) => {
    const [account] = await db
      .select({
        username: accounts.provider_username,
        status: accounts.status,
        verified: accounts.verified,
        deletedAt: accounts.deleted_at,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.user_id, req.user!.id),
          eq(accounts.provider, "github"),
        ),
      );
    res.set("Cache-Control", "no-store").json({
      data: {
        connected:
          !!account &&
          account.status === "active" &&
          account.verified &&
          !account.deletedAt,
        username: account?.username ?? null,
      },
    });
  },
);

export const startGithubConnection = catchAsync(
  async (req: Request, res: Response) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError("Invalid GitHub connection request", 400);
    const input = parsed.data;
    const session = req.cookies?.session;
    if (input.clientType === "web" && typeof session !== "string")
      throw new AppError("A browser session is required", 401);
    const state = `connect:${crypto.randomBytes(32).toString("base64url")}`;
    const pending: ConnectionRequest = {
      userId: req.user!.id,
      ...input,
      ...(input.clientType === "web" ? { sessionHash: digest(session) } : {}),
    };
    await redis.set(key("state", state), JSON.stringify(pending), "EX", 600);
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: callbackUri(),
      scope: "user:email",
      state,
    });
    res.set("Cache-Control", "no-store").json({
      data: { url: `https://github.com/login/oauth/authorize?${params}` },
    });
  },
);

async function loadIdentity(code: string): Promise<GithubIdentity> {
  const tokenResponse = await axios.post(
    "https://github.com/login/oauth/access_token",
    new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUri(),
    }).toString(),
    {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  const token = tokenResponse.data?.access_token;
  if (typeof token !== "string" || !token)
    throw new AppError("GitHub authorization was not completed", 400);
  const config = {
    timeout: 15000,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  };
  const [profileResponse, emailsResponse] = await Promise.all([
    axios.get("https://api.github.com/user", config),
    axios.get("https://api.github.com/user/emails", config),
  ]);
  const profile = z
    .object({
      id: z.number().int().positive(),
      login: z.string().min(1).max(255),
      name: z.string().nullable(),
    })
    .parse(profileResponse.data);
  const emails = z
    .array(
      z.object({
        email: z.email(),
        verified: z.boolean(),
        primary: z.boolean(),
      }),
    )
    .parse(emailsResponse.data);
  const email =
    emails.find((item) => item.verified && item.primary)?.email ??
    emails.find((item) => item.verified)?.email;
  if (!email)
    throw new AppError("GitHub must have a verified email address", 400);
  return {
    id: String(profile.id),
    username: profile.login,
    ...(profile.name ? { name: profile.name } : {}),
    email,
    token,
  };
}

async function finish(userId: string, identity: GithubIdentity) {
  const user = await connectGithubIdentity(userId, identity);
  if (user.forgejo_id === null) {
    try {
      const { addUserOnboardingJob } =
        await import("../../jobs/user-onboarding.js");
      await addUserOnboardingJob({ userId });
    } catch {
      console.error("Could not enqueue GitHub onboarding", { userId });
    }
  }
  return user;
}

export const githubConnectionCallback = catchAsync(
  async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    const state = req.query.state;
    if (typeof state !== "string")
      throw new AppError("Invalid GitHub connection state", 400);
    const stored = await redis.getdel(key("state", state));
    if (!stored)
      throw new AppError("GitHub connection expired. Please try again", 400);
    const pending = JSON.parse(stored) as ConnectionRequest;
    const redirect =
      pending.clientType === "web"
        ? new URL("/settings", env.NEXTJS_APP_URL)
        : new URL(env.VIBEONGO_APP_DEEP_LINK + "/auth/github-connected");
    if (pending.state) redirect.searchParams.set("state", pending.state);
    try {
      if (pending.clientType === "web") {
        const sessionToken = req.cookies?.session;
        if (
          typeof sessionToken !== "string" ||
          digest(sessionToken) !== pending.sessionHash
        )
          throw new AppError(
            "The signed-in account changed. Please try again",
            401,
          );
        const session = await findWebSession(sessionToken);
        const claims = session
          ? undefined
          : jwt.verify(sessionToken, env.JWT_SECRET);
        const subject =
          session?.user_id ??
          (typeof claims === "object" ? claims.id : undefined);
        const user =
          typeof subject === "string"
            ? await findAuthorizedUser(subject)
            : undefined;
        if (
          subject !== pending.userId ||
          !user ||
          (!session &&
            (typeof claims !== "object" ||
              (claims.authVersion ?? 0) !== user.auth_version))
        )
          throw new AppError("Invalid connection session", 401);
      }
      if (typeof req.query.code !== "string")
        throw new AppError("GitHub connection was cancelled", 400);
      const identity = await loadIdentity(req.query.code);
      if (pending.clientType === "mobile") {
        // Linking is deferred until this app proves possession of its PKCE verifier.
        const ticket = crypto.randomBytes(32).toString("base64url");
        await redis.set(
          key("ticket", ticket),
          JSON.stringify({ ...pending, identity }),
          "EX",
          60,
        );
        redirect.searchParams.set("ticket", ticket);
      } else {
        await finish(pending.userId, identity);
        redirect.searchParams.set("github", "connected");
      }
    } catch (error) {
      redirect.searchParams.set("github", "error");
      redirect.searchParams.set(
        "message",
        error instanceof AppError
          ? error.message
          : "Could not connect GitHub. Please try again",
      );
    }
    res.redirect(redirect.toString());
  },
);

export const completeMobileGithubConnection = catchAsync(
  async (req: Request, res: Response) => {
    const parsed = z
      .object({
        ticket: z.string().min(32).max(128),
        state: z.string().min(10).max(256),
        codeVerifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
      })
      .safeParse(req.body);
    if (!parsed.success)
      throw new AppError("Invalid connection verification", 400);
    const { ticket, state, codeVerifier } = parsed.data;
    const stored = await redis.getdel(key("ticket", ticket));
    if (!stored)
      throw new AppError("GitHub connection expired. Please try again", 400);
    const pending = JSON.parse(stored) as ConnectionRequest & {
      identity: GithubIdentity;
    };
    const challenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    if (
      pending.clientType !== "mobile" ||
      pending.userId !== req.user!.id ||
      pending.state !== state ||
      pending.codeChallenge !== challenge
    )
      throw new AppError("GitHub connection verification failed", 401);
    const user = await finish(pending.userId, pending.identity);
    res.set("Cache-Control", "no-store").json({ data: toPublicUser(user) });
  },
);
