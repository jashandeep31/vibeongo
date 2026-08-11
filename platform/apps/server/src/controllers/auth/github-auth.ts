import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";

import axios from "axios";
import { z } from "zod";
import { createOrGetUser } from "./create-or-get-user.js";
import { sessionCookieOptions } from "../../lib/session-cookie.js";

const sessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const mobileAuthStateSchema = z.object({
  client: z.literal("mobile"),
  redirectUri: z.string(),
});

const getMobileRedirectUri = (value: unknown) => {
  if (typeof value !== "string") return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const isAppRedirect =
    url.protocol === "mobileapp:" &&
    url.hostname === "auth" &&
    url.pathname === "/callback";
  const isDevelopmentRedirect =
    env.NODE_ENV === "development" &&
    (url.protocol === "exp:" || url.protocol === "exps:");
  const isAllowedWebRedirect =
    (url.protocol === "http:" || url.protocol === "https:") &&
    env.ALLOWED_ORIGINS.includes(url.origin);

  return isAppRedirect || isDevelopmentRedirect || isAllowedWebRedirect
    ? url.toString()
    : null;
};

const redirectToMobileApp = (
  res: Response,
  redirectUri: string,
  params: Record<string, string>,
) => {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  res.redirect(url.toString());
};

const githubProfileSchema = z.object({
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  login: z.string().nullable().optional(),
});

const githubEmailsSchema = z.array(
  z.object({
    email: z.string(),
    primary: z.boolean(),
    verified: z.boolean(),
  }),
);

export const githubAuthUrl = catchAsync(async (req: Request, res: Response) => {
  const requestUrl = "https://github.com/login/oauth/authorize";
  const params: Record<string, string> = {
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.BACKEND_URL}/api/v1/auth/github/callback`,
    scope: "user:email",
  };

  if (req.query.client === "mobile") {
    const redirectUri = getMobileRedirectUri(req.query.redirect_uri);
    if (!redirectUri) {
      res.status(400).json({ error: "Invalid mobile redirect URI" });
      return;
    }

    params.state = jwt.sign({ client: "mobile", redirectUri }, env.JWT_SECRET, {
      expiresIn: "10m",
    });
  }

  res.redirect(`${requestUrl}?${new URLSearchParams(params)}`);
});

export const githubAuthCallbackController = catchAsync(
  async (req: Request, res: Response) => {
    const { code, state } = req.query;

    let mobileRedirectUri: string | null = null;
    if (state !== undefined) {
      if (typeof state !== "string") {
        res.status(400).json({ error: "Invalid OAuth state" });
        return;
      }

      try {
        const decodedState = mobileAuthStateSchema.parse(
          jwt.verify(state, env.JWT_SECRET),
        );
        mobileRedirectUri = getMobileRedirectUri(decodedState.redirectUri);
      } catch {
        res.status(400).json({ error: "Invalid or expired OAuth state" });
        return;
      }

      if (!mobileRedirectUri) {
        res.status(400).json({ error: "Invalid mobile redirect URI" });
        return;
      }
    }

    if (typeof code !== "string") {
      if (mobileRedirectUri) {
        redirectToMobileApp(res, mobileRedirectUri, {
          error: "oauth_cancelled",
        });
        return;
      }
      res.status(400).json({ error: "Missing GitHub authorization code" });
      return;
    }

    const accessTokenUrl = "https://github.com/login/oauth/access_token";
    const tokenResponse = await axios.post(
      accessTokenUrl,
      new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${env.BACKEND_URL}/api/v1/auth/github/callback`,
      }).toString(),
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const accessToken = tokenResponse.data?.access_token;

    if (!accessToken || typeof accessToken !== "string") {
      res.status(400).json({ error: "Invalid code" });
      return;
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    };

    const [userResponse, emailsResponse] = await Promise.all([
      axios.get("https://api.github.com/user", { headers }),
      axios.get("https://api.github.com/user/emails", { headers }),
    ]);

    const profile = githubProfileSchema.parse(userResponse.data);
    const emails = githubEmailsSchema.parse(emailsResponse.data);

    const primaryVerifiedEmail = emails.find(
      (email) => email.primary && email.verified,
    )?.email;

    const verifiedEmail = emails.find((email) => email.verified)?.email;

    const email = primaryVerifiedEmail || verifiedEmail || profile.email;
    if (!email) {
      res.status(400).json({ error: "No email found for this github account" });
      return;
    }

    if (!profile.login) {
      res
        .status(400)
        .json({ error: "No username found for this github account" });
      return;
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const user_agent = req.headers["user-agent"];
    const { user, account } = await createOrGetUser({
      email,
      name: profile.name ?? undefined,
      token: accessToken,
      username: profile.login,
      ip,
      user_agent,
    });

    if (account.status !== "active") {
      if (mobileRedirectUri) {
        redirectToMobileApp(res, mobileRedirectUri, {
          error: "account_inactive",
        });
        return;
      }
      throw new Error("Account is not active");
    }

    if (account.verified === false) {
      if (mobileRedirectUri) {
        redirectToMobileApp(res, mobileRedirectUri, {
          error: "invite_required",
        });
        return;
      }
      res.redirect(env.FRONTEND_URL + "/invite");
      return;
    }

    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.cookie("session", token, {
      ...sessionCookieOptions,
      maxAge: sessionMaxAgeMs,
    });

    if (mobileRedirectUri) {
      redirectToMobileApp(res, mobileRedirectUri, { token });
      return;
    }

    res.redirect(env.FRONTEND_URL || "http://localhost:3000/dashboard");
  },
);
