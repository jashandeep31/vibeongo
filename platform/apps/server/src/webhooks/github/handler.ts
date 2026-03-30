import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import { env } from "../../lib/env.js";
import path from "path";
import fs from "fs/promises";

const BASE_DIR = process.cwd();
const filepath = path.join(BASE_DIR, "vibeongo.2026-03-28.private-key.pem");
const privateKey = await fs.readFile(filepath, "utf8");

// ------ octokitApp Setup ------
const octokitApp = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: privateKey,
  webhooks: {
    secret: env.GITHUB_WEBHOOK_SECRET,
  },
});

// ------ Issue opening handling ------
octokitApp.webhooks.on("issues.opened", async (event) => {
  const payload = event.payload;
  const octokit = event.octokit;

  const username = payload.issue?.user?.login;
  if (username === "jashandeep31") {
    // things to do now
    // 1. create task to do as per the test
    // 2. load the vps
    // 3. create the commeno
    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.issue.number,
        body: `thanks @jashandeep31 i am looking into it`,
        headers: {
          "x-github-api-version": "2026-03-10",
        },
      },
    );
  }
});

// ------ Issue comment handling ------
octokitApp.webhooks.on("issue_comment", async (event) => {
  const payload = event.payload;
  const username = payload.issue.user.login;
  if (username === "jashandeep31") {
  }
});

// --- Any webhook handling ------
octokitApp.webhooks.onAny(async (event) => {
  // console.log(event.name, "this is not handled");
});

export const githubAppWebhookMiddleware = createNodeMiddleware(
  octokitApp.webhooks,
  {
    path: "/webhook",
  },
);
