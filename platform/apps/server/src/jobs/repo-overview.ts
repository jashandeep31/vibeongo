import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";

export const GIT_REPOS_OVERVIEW_QUEUE_NAME = "git-repos-overview";

export type GitRepoOverviewJobData = {
  overviewJobId: string;
  repoId: string;
  userId: string;
};

const gitReposOverviewQueue = new Queue<
  GitRepoOverviewJobData,
  void,
  "git-repo-overview-job"
>(GIT_REPOS_OVERVIEW_QUEUE_NAME, {
  connection: redis as any,
});

gitReposOverviewQueue.on("error", (error) => {
  console.error("GitHub repository overview queue error", error);
});

export const addGitRepoOverviewJob = async (data: GitRepoOverviewJobData) => {
  await gitReposOverviewQueue.add("git-repo-overview-job", data, {
    jobId: data.overviewJobId,
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
};
