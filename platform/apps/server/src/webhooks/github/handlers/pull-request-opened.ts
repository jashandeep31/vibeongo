import { PullRequestOpenedEvent } from "@octokit/webhooks-types";
import { WebhookHandler } from "../types.js";
import { db, eq, githubRepos } from "@repo/db";
import { pullRequestOpenedHandler } from "../../../services/github/pull-request-handler.js";

export const pullRequestOpenedWebhookHandler = async (
  event: WebhookHandler<PullRequestOpenedEvent>,
) => {
  const { payload, octokit } = event;

  const requestOpener = payload.pull_request.user.login;
  const full_name = payload.repository.full_name;
  if (!full_name) {
    return;
  }

  const [githubRepo] = await db
    .select()
    .from(githubRepos)
    .where(eq(githubRepos.full_name, full_name));

  if (!githubRepo) return;

  if (!githubRepo.auto_review_pull_requests_enabled) {
    const body = payload.pull_request.body;

    if (githubRepo.repo_owner_username !== requestOpener) return;
    if (!body?.includes("@vibeongo")) return;
  }

  await pullRequestOpenedHandler({
    gitRepoId: githubRepo.id,
    prNumber: payload.pull_request.number,
    sessionCat: "auto",
  });

  await octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.pull_request.number,
      body: `👋 Got it! I'm on it.
  🛠️ Fetching live logs for this pull request — this can take up to 5 minutes.
  🌐 You can monitor progress on the live website.`,
      headers: {
        "x-github-api-version": "2026-03-10",
      },
    },
  );

  return;
};
