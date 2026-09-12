import { redis } from "../lib/valkey.js";
import { AppError } from "../lib/app-error.js";
import { getForgejoUserById } from "../services/forgejo/user-actions.js";

const FORGEJO_USERNAME_CACHE_TTL_SECONDS = 60 * 15;
const getKey = (forgejoId: number) => `FORGEJO_USERNAME:${forgejoId}`;

export async function getCachedForgejoUsername(
  forgejoId: number,
): Promise<string> {
  const key = getKey(forgejoId);

  try {
    const cachedUsername = await redis.get(key);
    if (cachedUsername && cachedUsername !== "null") return cachedUsername;
  } catch (error) {
    console.error(
      "Redis get failed, falling back to the Forgejo API",
      error,
    );
  }

  const forgejoUser = await getForgejoUserById(forgejoId);
  if (!forgejoUser) {
    throw new AppError(`Forgejo user ${forgejoId} was not found`, 502);
  }

  const username = forgejoUser.username;

  try {
    await redis.set(
      key,
      username,
      "EX",
      FORGEJO_USERNAME_CACHE_TTL_SECONDS,
    );
  } catch (error) {
    console.error("Redis set failed", error);
  }

  return username;
}
