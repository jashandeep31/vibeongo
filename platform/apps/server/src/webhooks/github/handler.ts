import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import { env } from "../../lib/env.js";
import path from "path";
import fs from "fs/promises";

const BASE_DIR = process.cwd();
const filepath = path.join(BASE_DIR, "vibeongo.2026-03-28.private-key.pem");
const privateKey = await fs.readFile(filepath, "utf8");

const octokitApp = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: privateKey,
  webhooks: {
    secret: env.GITHUB_WEBHOOK_SECRET,
  },
});

octokitApp.webhooks.onAny(async (event) => {
  console.log(event.name, event.payload);
});

export const githubAppWebhookMiddleware = createNodeMiddleware(
  octokitApp.webhooks,
  {
    path: "/webhook",
  },
);
