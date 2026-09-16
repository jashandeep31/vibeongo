import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { revokeGitRepoAccessToken } from "../services/git-repo-access-token/revoke-git-repo-access-token.js";
import {
  GIT_REPO_ACCESS_TOKEN_REVOCATION_JOB_NAME,
  GIT_REPO_ACCESS_TOKEN_REVOCATION_QUEUE_NAME,
  type GitRepoAccessTokenRevocationJobData,
} from "./git-repo-access-token-revocation.js";

export const gitRepoAccessTokenRevocationWorker = new Worker<
  GitRepoAccessTokenRevocationJobData,
  void,
  typeof GIT_REPO_ACCESS_TOKEN_REVOCATION_JOB_NAME
>(
  GIT_REPO_ACCESS_TOKEN_REVOCATION_QUEUE_NAME,
  async (job) => {
    await revokeGitRepoAccessToken({
      tokenId: job.data.tokenId,
      reason: job.data.reason,
    });
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 5,
  },
);

gitRepoAccessTokenRevocationWorker.on("completed", (job) => {
  console.log(
    `Git access token revocation job ${job.id ?? "unknown"} completed`,
  );
});

gitRepoAccessTokenRevocationWorker.on("error", (error) => {
  console.error("Git access token revocation worker error", error);
});

gitRepoAccessTokenRevocationWorker.on("failed", (job, error) => {
  console.error(
    `Git access token revocation job ${job?.id ?? "unknown"} failed`,
    error,
  );
});
