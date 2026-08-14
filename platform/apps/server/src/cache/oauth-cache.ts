import { AppError } from "../lib/app-error.js";
import { redis } from "../lib/valkey.js";
import crypto from "crypto";

function getKey(hash: string) {
  return `user_auth_token:${hash}`;
}
export const addHashedTokenAndUserIDd = async (
  hashed: string,
  userId: string,
) => {
  await redis.set(getKey(hashed), userId, "EX", 60);
};

export const getUserIDFromExchangeToken = async (
  token: string,
): Promise<string> => {
  const hash = crypto.createHash("sha256").update(token).digest("hex");

  const userId = await redis.getdel(getKey(hash));
  if (!userId) throw new AppError("Token is not valid", 401);

  return userId;
};
