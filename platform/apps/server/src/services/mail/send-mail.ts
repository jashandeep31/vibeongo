import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { env } from "../../lib/env.js";

interface SendEmailProps {
  toAddress: string;
  fromAddress: string;
  html: string;
  subject: string;
  bodyText: string;
}

export const SES_CLIENT = new SESClient({
  region: env.AWS_SES_REGION,
  maxAttempts: 2,
  requestHandler: { connectionTimeout: 3000, requestTimeout: 10000 },
  credentials: {
    accessKeyId: env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SES_SECRET_KEY,
  },
});

const createSendEmailCommand = ({
  toAddress,
  fromAddress,
  html,
  subject,
  bodyText,
}: SendEmailProps) => {
  return new SendEmailCommand({
    Destination: {
      CcAddresses: [],
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: html,
        },
        Text: {
          Charset: "UTF-8",
          Data: bodyText,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: fromAddress,
    ReplyToAddresses: [],
  });
};

export const sendEmail = async (props: SendEmailProps) => {
  const command = createSendEmailCommand(props);
  return await SES_CLIENT.send(command);
};

export function requireAuthEmailConfiguration() {
  if (
    !env.AWS_SES_FROM_EMAIL ||
    env.AWS_SES_FROM_EMAIL.endsWith("@example.com") ||
    !env.EMAIL_OTP_HASH_SECRET ||
    env.EMAIL_OTP_HASH_SECRET.startsWith("replace-") ||
    !env.AWS_SES_ACCESS_KEY_ID ||
    !env.AWS_SES_SECRET_KEY ||
    env.AWS_SES_ACCESS_KEY_ID.startsWith("replace-") ||
    env.AWS_SES_SECRET_KEY.startsWith("replace-")
  ) {
    throw new Error("Authentication email configuration is missing");
  }
}

export async function sendAuthOtpEmail(input: {
  toAddress: string;
  otp: string;
  purpose: "signup_verification" | "password_reset";
}) {
  requireAuthEmailConfiguration();
  if (!/^\d{6}$/.test(input.otp)) throw new Error("Invalid email code");
  const action =
    input.purpose === "signup_verification"
      ? "verify your email"
      : "reset your password";
  const subject =
    input.purpose === "signup_verification"
      ? "Verify your VibeOnGo email"
      : "Reset your VibeOnGo password";
  return sendEmail({
    toAddress: input.toAddress,
    fromAddress: env.AWS_SES_FROM_EMAIL!,
    subject,
    bodyText: `Your code to ${action} is ${input.otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your code to ${action} is:</p><p><strong>${input.otp}</strong></p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
  });
}
