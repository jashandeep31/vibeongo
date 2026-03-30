import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";

import axios from "axios";

export const githubAuthUrl = catchAsync(async (req: Request, res: Response) => {
  const RequestUrl = "https://github.com/login/oauth/authorize";
  const params = {
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: "http://localhost:8000/api/v1/auth/github/callback",
    scope: "user:email",
  };

  res.redirect(`${RequestUrl}?${new URLSearchParams(params)}`);
});

export const githubAuthCallbackController = catchAsync(
  async (req: Request, res: Response) => {
    const token = "";
    if (token) {
      const userRes = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(userRes.data);

      const emailsRes = await axios.get("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(emailsRes.data);
      return;
    }
    const AcccessTokenUrl = "https://github.com/login/oauth/access_token";
    const response = await axios.post(AcccessTokenUrl, {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: req.query.code,
      redirect_uri: "http://localhost:8000/api/v1/auth/github/callback",
    });
    console.log(response.data.access_token);

    // const user = await axios.get("https://api.github.com/user", {
    //   headers: {
    //     Authorization: `Bearer ${response.data.access_token}`,
    //   },
    // });
    res.send(response.data);
  },
);
