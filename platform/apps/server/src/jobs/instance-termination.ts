import { and, db, eq, inArray, instanceSlots } from "@repo/db";
import { Queue } from "bullmq";
import { AppError } from "../lib/app-error.js";
import { redis } from "../lib/valkey.js";

export const INSTANCE_TERMINATION_QUEUE_NAME = "instance-termination";
export const INSTANCE_TERMINATION_JOB_NAME = "terminate-instance" as const;

export type InstanceTerminationJobData = {
  instanceId: string;
  userId: string;
};

const instanceTerminationQueue = new Queue<
  InstanceTerminationJobData,
  void,
  typeof INSTANCE_TERMINATION_JOB_NAME
>(INSTANCE_TERMINATION_QUEUE_NAME, {
  connection: redis as any,
});

instanceTerminationQueue.on("error", (error) => {
  console.error("Instance termination queue error", error);
});

export const addToInstanceTerminationQueue = async (
  data: InstanceTerminationJobData,
) => {
  const [slot] = await db
    .update(instanceSlots)
    .set({
      status: "terminating",
      updated_at: new Date(),
    })
    .where(
      and(
        eq(instanceSlots.instance_id, data.instanceId),
        eq(instanceSlots.user_id, data.userId),
        inArray(instanceSlots.status, [
          "active",
          "provisioning",
          "terminating",
        ]),
      ),
    )
    .returning({ id: instanceSlots.id });

  if (!slot) {
    throw new AppError("Active instance slot not found", 404);
  }

  return await instanceTerminationQueue.add(INSTANCE_TERMINATION_JOB_NAME, data, {
    jobId: `terminate-${data.instanceId}`,
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: true,
    removeOnFail: 500,
  });
};
