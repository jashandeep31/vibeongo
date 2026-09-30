import { redis } from "../lib/valkey.js";

// Which users have an open websocket, shared by every api process: the one
// creating a notification may not hold the user's sockets. One sorted set per
// user, member = socket id, score = when that entry expires.

// refreshed on every heartbeat (30s); a socket of a crashed process drops out
// after this without its close ever running
const PRESENCE_TTL_MS = 75_000;

const presenceKey = (userId: string) => `notification-presence:${userId}`;

export const markSocketOnline = async (userId: string, socketId: string) => {
  const key = presenceKey(userId);
  await redis
    .multi()
    .zadd(key, Date.now() + PRESENCE_TTL_MS, socketId)
    .pexpire(key, PRESENCE_TTL_MS)
    .exec();
};

export const markSocketsOnline = async (
  sockets: Array<{ userId: string; socketId: string }>,
) => {
  if (!sockets.length) return;
  const expiresAt = Date.now() + PRESENCE_TTL_MS;
  const pipeline = redis.pipeline();
  for (const { userId, socketId } of sockets) {
    const key = presenceKey(userId);
    pipeline.zadd(key, expiresAt, socketId).pexpire(key, PRESENCE_TTL_MS);
  }
  await pipeline.exec();
};

export const markSocketOffline = async (userId: string, socketId: string) => {
  await redis.zrem(presenceKey(userId), socketId);
};

export const isUserOnline = async (userId: string) => {
  const key = presenceKey(userId);
  const [, count] = await Promise.all([
    redis.zremrangebyscore(key, "-inf", Date.now()),
    redis.zcount(key, Date.now(), "+inf"),
  ]);
  return count > 0;
};
