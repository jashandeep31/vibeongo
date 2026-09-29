import { redis } from "../lib/valkey.js";

const COOLDOWN_SECONDS = 3;
const HOURLY_LIMIT = 10;
const HOUR_SECONDS = 60 * 60;

const cooldownKey = (userId: string) => `SPEECH_TOKEN_COOLDOWN:${userId}`;
const hourlyKey = (userId: string) => `SPEECH_TOKEN_HOURLY:${userId}`;

export type SpeechTokenRateLimit =
  | { allowed: true }
  | { allowed: false; reason: "cooldown" | "hourly" };

export async function consumeSpeechTokenRateLimit(
  userId: string,
): Promise<SpeechTokenRateLimit> {
  try {
    // SET NX succeeds only when no token was issued in the last few seconds.
    const cooldown = await redis.set(
      cooldownKey(userId),
      "1",
      "EX",
      COOLDOWN_SECONDS,
      "NX",
    );
    if (cooldown !== "OK") return { allowed: false, reason: "cooldown" };

    // The hour starts at the first token: EXPIRE NX only sets the TTL on a
    // fresh counter, so later tokens don't extend the window.
    const key = hourlyKey(userId);
    const results = await redis
      .multi()
      .incr(key)
      .expire(key, HOUR_SECONDS, "NX")
      .exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    if (count > HOURLY_LIMIT) return { allowed: false, reason: "hourly" };

    return { allowed: true };
  } catch (error) {
    console.error("Redis speech token rate limit failed, allowing", error);
    return { allowed: true };
  }
}
