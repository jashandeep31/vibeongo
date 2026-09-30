import axios from "axios";
import { env } from "../../lib/env.js";
import { encryptData } from "../../lib/encryption-decryption.js";
import { db, instanceOpenRouterKeys, eq } from "@repo/db";
import { INTERNAL_MONEY_SCALE } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";

export const openRouterInterface = axios.create({
  baseURL: env.OPENROUTER_API_ENDPOINT,
  headers: {
    Authorization: `Bearer ${env.OPENROUTER_MANAGEMENT_KEY}`,
  },
});

interface CreateOpenRouterVirtualKeyAndSave {
  instanceId: string;
  limit_in_dollars: number;
  expires_after_in_minutes: number;
}
export async function createOpenRouterVirtualKeyAndSave({
  instanceId,
  expires_after_in_minutes,
  limit_in_dollars,
}: CreateOpenRouterVirtualKeyAndSave): Promise<boolean> {
  const expires_at = new Date();
  expires_at.setMinutes(expires_at.getMinutes() + expires_after_in_minutes);

  const res = await openRouterInterface.post("/keys", {
    expires_at: expires_at.toISOString(),
    include_byok_in_limit: true,
    limit: limit_in_dollars,
    name: instanceId,
  });
  if (res.status !== 201) {
    // TODO: implment a some log system here to tell a system incase creation of keys fails
    return false;
  }

  const encrypted = encryptData(res.data.key);

  // NOTE: this can be moved to platform/apps/server/src/services/instances/spin-up-and-save-instance.ts
  // But i am not sure how this will GO.
  // will openrouter allows us to create multiple keys, does each user need these keys or will they oppose it
  // and failing of the openrouter api can also stop creation of instance (incase we hit there rate limit )
  //  currently treating it as optional thing
  await db.insert(instanceOpenRouterKeys).values({
    instance_id: instanceId,

    encrypted_key: encrypted.encryptedData,
    iv: encrypted.iv,
    tag: encrypted.tag,

    hash: res.data.data.hash,
  });

  return true;
}

const OPENROUTER_SETTLE_ATTEMPTS = 3;

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function getOpenRouterKeyChargesAnTerminateKey(
  instanceId: string,
): Promise<number> {
  const [openrouterKeyData] = await db
    .select()
    .from(instanceOpenRouterKeys)
    .where(eq(instanceOpenRouterKeys.instance_id, instanceId));
  if (!openrouterKeyData) return 0;

  let lastError: unknown;
  for (let attempt = 1; attempt <= OPENROUTER_SETTLE_ATTEMPTS; attempt++) {
    try {
      const res = await openRouterInterface.patch(
        `/keys/${openrouterKeyData.hash}`,
        { disabled: true },
        { timeout: 10_000 },
      );
      const usage: unknown = res.data?.data?.usage;
      if (typeof usage !== "number" || !Number.isFinite(usage)) {
        throw new Error("OpenRouter key response has no usage");
      }
      return Math.ceil(Math.abs(usage) * INTERNAL_MONEY_SCALE);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.error(
          `OpenRouter key for instance ${instanceId} no longer exists, no AI usage charged`,
        );
        return 0;
      }
      lastError = error;
      if (attempt < OPENROUTER_SETTLE_ATTEMPTS) await wait(attempt * 1_000);
    }
  }

  console.error(
    `Could not disable the OpenRouter key and read its usage for instance ${instanceId}`,
    lastError,
  );
  throw new AppError(
    "Could not settle AI usage for this instance. Please try again.",
    502,
  );
}
