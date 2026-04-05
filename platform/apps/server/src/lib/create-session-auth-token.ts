import { db, sessionAuthTokens } from "@repo/db";
import * as crypto from "crypto";
import { createId } from "@paralleldrive/cuid2";

export const createSessionAuthToken = async (
  projectSessionId: string,
): Promise<string> => {
  const token = `vps_${createId()}${crypto.randomBytes(16).toString("hex")}`;

  await db.insert(sessionAuthTokens).values({
    session_id: projectSessionId,
    token,
    expires_at: null,
  });

  return token;
};
