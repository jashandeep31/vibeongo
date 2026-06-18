import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import { env } from "../../lib/env.js";
import path from "path";
import fs from "fs/promises";
import { issueOpenedHandler } from "./handlers/issue-opened.js";
import { pullRequestOpenedWebhookHandler } from "./handlers/pull-request-opened.js";
import { commentHandler } from "./handlers/comment-handler.js";

const BASE_DIR = process.cwd();
const filepath = path.join(BASE_DIR, "vibeongo.2026-03-28.private-key.pem");
const privateKey = await fs.readFile(filepath, "utf8");

// ------ octokitApp Setup ------
export const octokitApp: App = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: privateKey,
  webhooks: {
    secret: env.GITHUB_WEBHOOK_SECRET,
  },
});

// ------ Issue opening handling ------
octokitApp.webhooks.on("issues.opened", issueOpenedHandler as any);
// ------ Pull request opening handling ------
octokitApp.webhooks.on(
  "pull_request.opened",
  pullRequestOpenedWebhookHandler as any,
);

// ------ Issue comment handling ------
octokitApp.webhooks.on("issue_comment", async (event) => {
  const payload = event.payload;
  // console.log(payload);
  commentHandler(event as any);
  // const username = payload.issue.user.login;
  //what we need to check here
  // 1. comment user is allowed to manage that repo means admin of it
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

// --- sending the comment from bot ---
// await octokitApp.request(
//   "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
//   {
//     owner: payload.repository.owner.login,
//     repo: payload.repository.name,
//     issue_number: payload.issue.number,
//     body: `thanks @jashandeep31 i am looking into it`,
//     headers: {
//       "x-github-api-version": "2026-03-10",
//     },
//   },
// );
