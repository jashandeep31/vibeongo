import axios from "axios";
import { env } from "../../lib/env.js";
import { encryptData } from "../../lib/encryption-decryption.js";
import { db, instanceOpenRouterKeys } from "@repo/db";

export const openRouterManagementInterface = axios.create({
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

  const res = await openRouterManagementInterface.post("/keys", {
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
