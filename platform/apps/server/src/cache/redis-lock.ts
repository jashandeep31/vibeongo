import { randomUUID } from "node:crypto";
import { redis } from "../lib/valkey.js";

const DEFAULT_LOCK_TTL_MS = 2 * 60 * 1000;

const lockKey = (name: string) => `LOCK:${name}`;

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

export type RedisLock = { name: string; token: string };

export async function acquireRedisLock(
  name: string,
  ttlMs = DEFAULT_LOCK_TTL_MS,
): Promise<RedisLock | undefined> {
  const token = randomUUID();
  const result = await redis.set(lockKey(name), token, "PX", ttlMs, "NX");
  if (result !== "OK") return;
  return { name, token };
}

export async function releaseRedisLock(lock: RedisLock): Promise<boolean> {
  try {
    const deleted = await redis.eval(
      RELEASE_SCRIPT,
      1,
      lockKey(lock.name),
      lock.token,
    );
    return deleted === 1;
  } catch (error) {
    console.error("Failed to release redis lock", lock.name, error);
    return false;
  }
}

export async function withRedisLock<T>(
  name: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_LOCK_TTL_MS,
): Promise<{ acquired: true; result: T } | { acquired: false }> {
  const lock = await acquireRedisLock(name, ttlMs);
  if (!lock) return { acquired: false };
  try {
    return { acquired: true, result: await fn() };
  } finally {
    await releaseRedisLock(lock);
  }
}
