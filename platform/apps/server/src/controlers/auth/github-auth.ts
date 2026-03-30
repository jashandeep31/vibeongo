import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";

import axios from "axios";
import { z } from "zod";
import { createOrGetUser } from "./create-or-get-user.js";

const sessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

const githubProfileSchema = z.object({
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
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
  const params = {
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: "http://localhost:8000/api/v1/auth/github/callback",
    scope: "user:email",
  };

  res.redirect(`${requestUrl}?${new URLSearchParams(params)}`);
});

export const githubAuthCallbackController = catchAsync(
  async (req: Request, res: Response) => {
    const { code } = req.query;

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
        redirect_uri: "http://localhost:8000/api/v1/auth/github/callback",
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

    const user = await createOrGetUser({
      email,
      name: profile.name ?? undefined,
      token: accessToken,
    });

    if (!user.id) {
      throw new Error("Something went wrong on our side");
    }

    res.cookie(
      "session",
      {
        id: user.id,
      },
      {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: sessionMaxAgeMs,
        path: "/",
      },
    );

    res.redirect(process.env.CLIENT_URL || "http://localhost:3000/dashboard");
  },
);
