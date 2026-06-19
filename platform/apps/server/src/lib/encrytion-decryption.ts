import crypto from "crypto";
import { Buffer } from "buffer";
import { env } from "./env.js";

/**
 * Encypts the data
 *
 * @param data - sting which you wanna encrypt
 * @returns {iv: string tag: string encrypted: string} -> iv= nonace , tag= for authentication , encrypted= encrypted data
 */

const ENCRYPTIONKEY = Buffer.from(env.ENCRYPTION_KEY, "base64");
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
 * Encypts the data
 *
 * @param  payload{iv: string tag: string encrypted: string} -> iv= nonace , tag= for authentication , encrypted= encrypted data
 * @returns encrypted string*/
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
