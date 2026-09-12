import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";

export const GIT_REPO_ACCESS_TOKEN_REVOCATION_QUEUE_NAME =
  "git-repo-access-token-revocation";
export const GIT_REPO_ACCESS_TOKEN_REVOCATION_JOB_NAME =
  "revoke-git-repo-access-token" as const;

export type GitRepoAccessTokenRevocationJobData = {
  tokenId: string;
};

const gitRepoAccessTokenRevocationQueue = new Queue<
  GitRepoAccessTokenRevocationJobData,
  void,
  typeof GIT_REPO_ACCESS_TOKEN_REVOCATION_JOB_NAME
>(GIT_REPO_ACCESS_TOKEN_REVOCATION_QUEUE_NAME, {
  connection: redis as any,
});

gitRepoAccessTokenRevocationQueue.on("error", (error) => {
  console.error("Git repository access token revocation queue error", error);
});

export const addGitRepoAccessTokenRevocationJob = async ({
  tokenId,
  expiresAt,
}: GitRepoAccessTokenRevocationJobData & { expiresAt?: Date }) => {
  return await gitRepoAccessTokenRevocationQueue.add(
    GIT_REPO_ACCESS_TOKEN_REVOCATION_JOB_NAME,
    { tokenId },
    {
      jobId: `revoke-git-repo-access-token-${tokenId}`,
      delay: expiresAt ? Math.max(0, expiresAt.getTime() - Date.now()) : 0,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
};
