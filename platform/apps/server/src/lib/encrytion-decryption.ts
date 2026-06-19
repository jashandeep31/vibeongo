import crypto from "crypto";
import { Buffer } from "buffer";
import { env } from "./env.js";

const ENCRYPTIONKEY = Buffer.from(env.ENCRYPTION_KEY, "base64");

/**
 * Encrypts a UTF-8 string with AES-256-CCM.
 *
 * @param data - Plain text value to encrypt.
 * @returns Base64-encoded encryption payload containing:
 * - `iv`: random nonce used for this encryption operation.
 * - `tag`: authentication tag used to verify ciphertext integrity.
 * - `encrypted`: encrypted representation of the input string.
 */
export function encryptData(data: string): {
  iv: string;
  tag: string;
  encrypted: string;
} {
  const dataBuffer = Buffer.from(data, "utf8");
  const iv = crypto.randomBytes(12); // 12 bytes is valid for CCM (7-13 allowed)

  const cipher = crypto.createCipheriv("aes-256-ccm", ENCRYPTIONKEY, iv, {
    authTagLength: 16,
  });

  const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    encrypted: encrypted.toString("base64"),
  };
}

/**
 * Decrypts an AES-256-CCM payload produced by `encryptData`.
 *
 * @param payload - Base64-encoded encryption payload containing the nonce,
 * authentication tag, and encrypted data.
 * @returns Original UTF-8 plain text string.
 * @throws If the authentication tag is invalid or the payload cannot be decrypted.
 */
export function decryptData(payload: {
  iv: string;
  tag: string;
  encrypted: string;
}) {
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const encrypted = Buffer.from(payload.encrypted, "base64");

  const decipher = crypto.createDecipheriv("aes-256-ccm", ENCRYPTIONKEY, iv, {
    authTagLength: 16,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
