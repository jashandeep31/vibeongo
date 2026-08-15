import { AppError } from "../lib/app-error.js";
import { redis } from "../lib/valkey.js";
import crypto from "crypto";

function getKey(hash: string) {
  return `user_auth_token:${hash}`;
}

function getMobileAuthorizationKey(state: string) {
  return `mobile_oauth_state:${hashValue(state)}`;
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

type PendingMobileAuthorization = {
  codeChallenge: string;
};

type MobileExchangeToken = {
  codeChallenge: string;
  stateHash: string;
  userId: string;
};

export const addPendingMobileAuthorization = async (
  state: string,
  codeChallenge: string,
) => {
  await redis.set(
    getMobileAuthorizationKey(state),
    JSON.stringify({ codeChallenge } satisfies PendingMobileAuthorization),
    "EX",
    10 * 60,
  );
};

export const consumePendingMobileAuthorization = async (state: string) => {
  const value = await redis.getdel(getMobileAuthorizationKey(state));
  if (!value) throw new AppError("OAuth state is invalid or expired", 401);

  try {
    return JSON.parse(value) as PendingMobileAuthorization;
  } catch {
    throw new AppError("OAuth state is invalid", 401);
  }
};

export const addMobileExchangeToken = async (
  token: string,
  userId: string,
  state: string,
  codeChallenge: string,
) => {
  await redis.set(
    getKey(hashValue(token)),
    JSON.stringify({
      codeChallenge,
      stateHash: hashValue(state),
      userId,
    } satisfies MobileExchangeToken),
    "EX",
    60,
  );
};

export const getUserIDFromExchangeToken = async (
  token: string,
  state: string,
  codeVerifier: string,
): Promise<string> => {
  const value = await redis.getdel(getKey(hashValue(token)));
  if (!value) throw new AppError("Token is not valid", 401);

  let exchange: MobileExchangeToken;
  try {
    exchange = JSON.parse(value) as MobileExchangeToken;
  } catch {
    throw new AppError("Token is not valid", 401);
  }

  const receivedChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const stateMatches = crypto.timingSafeEqual(
    Buffer.from(exchange.stateHash),
    Buffer.from(hashValue(state)),
  );
  const challengeMatches = crypto.timingSafeEqual(
    Buffer.from(exchange.codeChallenge),
    Buffer.from(receivedChallenge),
  );

  if (!stateMatches || !challengeMatches) {
    throw new AppError("Token is not valid", 401);
  }

  return exchange.userId;
};
