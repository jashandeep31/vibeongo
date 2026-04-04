import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import { env } from "../../lib/env.js";
import path from "path";
import fs from "fs/promises";
import { db, eq, githubRepos, projects, users } from "@repo/db";
import { getRefinedTaskFromUserIssuesComment } from "../../ai/ai-functions/get-refined-task-from-user-issues-comment.js";

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
octokitApp.webhooks.on("issues.opened", async (event) => {
  const payload = event.payload;
  const octokit = event.octokit;

  const issueOpnerUsername = payload.issue?.user?.login;
  const full_name = payload.repository?.full_name;
  if (!issueOpnerUsername || !full_name) {
    return;
  }
  const [row] = await db
    .select({
      repo: githubRepos,
      user: users,
      project: projects,
    })
    .from(githubRepos)
    .innerJoin(users, eq(githubRepos.user_id, users.id))
    .leftJoin(projects, eq(githubRepos.default_project_id, projects.id))
    .where(eq(githubRepos.full_name, full_name));

  if (!row || !row.repo || !row.user || !row.project || !payload.issue.body) {
    console.log(row?.repo, row?.user, row?.project, payload.issue.body);
    return;
  }
  const task = await getRefinedTaskFromUserIssuesComment(payload.issue.body);
  console.log(row);

  console.log(task);
  //1. spin the vps
  //2. pass as the task
});

// ------ Issue comment handling ------
octokitApp.webhooks.on("issue_comment", async (event) => {
  const payload = event.payload;
  const username = payload.issue.user.login;
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
// await octokit.request(
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
