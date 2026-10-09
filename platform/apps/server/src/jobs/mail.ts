import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";
import { encryptMailOtp } from "../services/mail/mail-otp-payload.js";

export const MAIL_QUEUE_NAME = "mail";
export const MAIL_JOB_NAME = "send-auth-otp" as const;
export type MailJobData = {
  challengeId: string;
  encryptedOtp: ReturnType<typeof encryptMailOtp>;
};
export const mailQueue = new Queue<MailJobData, void, typeof MAIL_JOB_NAME>(
  MAIL_QUEUE_NAME,
  {
    connection: {
      ...redis.options,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    } as any,
  },
);
mailQueue.on("error", () => console.error("Mail queue connection error"));

export async function addMailOtpJob(challengeId: string, otp: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      mailQueue.add(
        MAIL_JOB_NAME,
        { challengeId, encryptedOtp: encryptMailOtp(challengeId, otp) },
        {
          jobId: `mail-otp-${challengeId}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      ),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Mail queue submission timed out")),
          5000,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
