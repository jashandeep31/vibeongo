import { db, eq, users } from "@repo/db";
import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { ensureForgejoUserAccount } from "../services/forgejo/user-actions.js";
import { addDemoProjectsToUserProfile } from "../services/users/add-demo-projects.js";
import {
  USER_ONBOARDING_QUEUE_NAME,
  type UserOnboardingJobData,
} from "./user-onboarding.js";

export const userOnboardingWorker = new Worker<UserOnboardingJobData>(
  USER_ONBOARDING_QUEUE_NAME,
  async (job) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, job.data.userId))
      .limit(1);

    if (!user) {
      throw new Error(`Onboarding user ${job.data.userId} was not found`);
    }

    await ensureForgejoUserAccount(user);
    await addDemoProjectsToUserProfile(user);
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 2,
  },
);

userOnboardingWorker.on("ready", () => {
  console.log("User onboarding worker is ready");
});

userOnboardingWorker.on("completed", (job) => {
  console.log(`User onboarding job ${job.id ?? "unknown"} completed`);
});

userOnboardingWorker.on("error", (error) => {
  console.error("User onboarding worker error", error);
});

userOnboardingWorker.on("failed", (job, error) => {
  console.error(`User onboarding job ${job?.id ?? "unknown"} failed`, error);
});
