import { Queue, Worker } from "bullmq";
import { redis } from "../lib/valkey.js";

const gitReposOverviewQueue = new Queue("git-repos-overview");

console.log("Running the queue");

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
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
  },
);
