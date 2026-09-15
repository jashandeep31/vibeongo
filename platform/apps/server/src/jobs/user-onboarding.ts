import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";

export const USER_ONBOARDING_QUEUE_NAME = "user-onboarding";
const USER_ONBOARDING_JOB_NAME = "user-onboarding-job" as const;

export type UserOnboardingJobData = {
  userId: string;
};

const userOnboardingQueue = new Queue<
  UserOnboardingJobData,
  void,
  typeof USER_ONBOARDING_JOB_NAME
>(USER_ONBOARDING_QUEUE_NAME, {
  connection: redis as any,
});

userOnboardingQueue.on("error", (error) => {
  console.error("User onboarding queue error", error);
});

export const addUserOnboardingJob = async (data: UserOnboardingJobData) => {
  const jobId = `user-onboarding-${data.userId}`;
  const existingJob = await userOnboardingQueue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();

    if (state === "failed") {
      await existingJob.retry();
      return;
    }

    if (state !== "completed") return;

    await existingJob.remove();
  }

  await userOnboardingQueue.add(USER_ONBOARDING_JOB_NAME, data, {
    jobId,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
};
