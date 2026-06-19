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
  await commentHandler(event as any);
});

// --- Any webhook handling ------
// octokitApp.webhooks.onAny(async (event) => {
//   // console.log(event.name, "this is not handled");
// });

export const githubAppWebhookMiddleware = createNodeMiddleware(
  octokitApp.webhooks,
  {
    path: "/webhook",
  },
);
