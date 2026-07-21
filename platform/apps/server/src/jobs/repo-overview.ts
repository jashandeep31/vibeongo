import { Queue, Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import Redis from "iovalkey";

const gitReposOverviewQueue = new Queue("git-repos-overview");

export const addGitRepoOverviewJob = async (repoId: string, userId: string) => {
  await gitReposOverviewQueue.add("git-repo-overview-job", {
    repoId,
    userId,
  });
};

new Worker(
  "git-repos-overview",
  async (job) => {
    const { repoId, userId } = job.data;
    console.log(repoId, userId);
  },
  {
    connection: redis,
  },
);
