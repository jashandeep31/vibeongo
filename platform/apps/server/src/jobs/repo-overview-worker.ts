import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import {
  GIT_REPOS_OVERVIEW_QUEUE_NAME,
  type GitRepoOverviewJobData,
} from "./repo-overview.js";

export const gitRepoOverviewWorker = new Worker<GitRepoOverviewJobData>(
  GIT_REPOS_OVERVIEW_QUEUE_NAME,
  async () => {},
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 2,
  },
);

gitRepoOverviewWorker.on("ready", () => {
  console.log("GitHub repository overview worker is ready");
});

gitRepoOverviewWorker.on("error", (error) => {
  console.error("GitHub repository overview worker error", error);
});

gitRepoOverviewWorker.on("failed", (job, error) => {
  console.error(
    `GitHub repository overview job ${job?.id ?? "unknown"} failed`,
    error,
  );
});
