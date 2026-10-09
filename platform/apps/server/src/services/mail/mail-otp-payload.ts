import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { env } from "../../lib/env.js";

const key = () => {
  if (!env.EMAIL_OTP_HASH_SECRET)
    throw new Error("Mail encryption configuration is missing");
  return createHash("sha256")
    .update(`vibeongo-mail-queue-v1:${env.EMAIL_OTP_HASH_SECRET}`)
    .digest();
};
// Redis job data must not contain a plaintext OTP. Bind the ciphertext to its challenge.
export function encryptMailOtp(challengeId: string, otp: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(challengeId));
  const ciphertext = Buffer.concat([
    cipher.update(otp, "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}
export function decryptMailOtp(
  challengeId: string,
  payload: ReturnType<typeof encryptMailOtp>,
) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(challengeId));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const otp = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  if (!/^\d{6}$/.test(otp)) throw new Error("Invalid mail payload");
  return otp;
}
