import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";

export const passwordHashOptions = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
} as const;

export class PasswordHashBusyError extends Error {}
let activeHashes = 0;
async function withHashSlot<T>(operation: () => Promise<T>): Promise<T> {
  if (activeHashes >= 4)
    throw new PasswordHashBusyError("Password authentication is busy");
  activeHashes++;
  try {
    return await operation();
  } finally {
    activeHashes--;
  }
}

export const hashPassword = (password: string) =>
  withHashSlot(() => argon2.hash(password, passwordHashOptions));
export const verifyPassword = (hash: string, password: string) =>
  withHashSlot(() => argon2.verify(hash, password));
export const passwordNeedsRehash = (hash: string) =>
  argon2.needsRehash(hash, passwordHashOptions);

// One dummy hash per process; missing identities still perform password verification.
let dummyHash: Promise<string> | undefined;
export function getDummyPasswordHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = hashPassword(randomBytes(32).toString("hex")).catch((error) => {
      dummyHash = undefined;
      throw error;
    });
  }
  return dummyHash;
}
