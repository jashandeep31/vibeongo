import { db, eq, projectConfig } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { decryptData } from "../../lib/encryption-decryption.js";

export const getDecryptedProjectConfig = async (
  project_id: string,
): Promise<string> => {
  const [projectConfigRow] = await db
    .select()
    .from(projectConfig)
    .where(eq(projectConfig.project_id, project_id));
  if (!projectConfigRow) {
    throw new AppError("Failed to project config", 404);
  }

  const decrypted = decryptData({
    iv: projectConfigRow.iv,
    tag: projectConfigRow.tag,
    encrypted: projectConfigRow.encrypted_config,
  });

  return decrypted;
};
