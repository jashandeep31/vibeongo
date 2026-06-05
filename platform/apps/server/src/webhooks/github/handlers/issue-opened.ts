import { IssuesOpenedEvent } from "@octokit/webhooks-types";
import { WebhookHandler } from "../types.js";
import { db, eq, githubRepos } from "@repo/db";
import { issueRequestHandler } from "../../../services/github/issue-hanlder.js";

export const issueOpenedHandler = async (
  event: WebhookHandler<IssuesOpenedEvent>,
) => {
  const { payload, octokit } = event;

  const body = payload?.issue?.body;
  if (!body) return;
  if (!body.includes("@vibeongo")) return;
  const requestOpener = payload.issue.user.login;

  const full_name = payload.repository?.full_name;
  if (!full_name) {
    return;
  }

  const [githubRepo] = await db
    .select()
    .from(githubRepos)
    .where(eq(githubRepos.full_name, full_name));

  if (!githubRepo || githubRepo.repo_owner_username !== requestOpener) {
    return;
  }

  await issueRequestHandler({
    gitRepoId: githubRepo.id,
    issueNumber: payload.issue.number!,
    sessionCat: "auto",
  });

  await octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      body: `👋 Got it! I'm on it.
        🛠️ Fetching live logs for this issue — this can take up to 5 minutes.
        🌐 You can monitor progress on the live website.`,
      headers: {
        "x-github-api-version": "2026-03-10",
      },
    },
  );

  return;
};
