import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";
import crypto from "crypto";

import axios from "axios";
import { z } from "zod";
import { createOrGetUser } from "./create-or-get-user.js";
import { sessionCookieOptions } from "../../lib/session-cookie.js";
import { addHashedTokenAndUserIDd } from "../../cache/oauth-cache.js";

const sessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

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
  const mobileState =
    req.query.client_id === "vibeongo-mobile" &&
    typeof req.query.state === "string"
      ? `mobile:${req.query.state}`
      : undefined;
  const params = {
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.BACKEND_URL}/api/v1/auth/github/callback`,
    scope: "user:email",
    ...(mobileState ? { state: mobileState } : {}),
  };

  res.redirect(`${requestUrl}?${new URLSearchParams(params)}`);
});

export const githubAuthCallbackController = catchAsync(
  async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (typeof code !== "string") {
      throw new Error("code is not string");
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
      throw new Error("Account is not active");
    }

    if (account.verified === false) {
      res.redirect(env.FRONTEND_URL + "/invite");
      return;
    }

    if (typeof state === "string" && state.startsWith("mobile:")) {
      const randomToken = crypto.randomBytes(32).toString("base64url");
      const hash = crypto
        .createHash("sha256")
        .update(randomToken)
        .digest("hex");

      await addHashedTokenAndUserIDd(hash, user.id);
      // const redirectUrl = new URL("vibeongo://auth/callback");
      const redirectUrl = new URL(
        env.VIBEONGO_APP_DEEP_LINK + "/auth/callback",
      );

      redirectUrl.searchParams.set("token", randomToken);
      redirectUrl.searchParams.set("state", state.slice("mobile:".length));
      res.redirect(redirectUrl.toString());
      return;
    }

    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.cookie("session", token, {
      ...sessionCookieOptions,
      maxAge: sessionMaxAgeMs,
    });
    res.redirect(env.FRONTEND_URL || "http://localhost:3000/dashboard");
  },
);
