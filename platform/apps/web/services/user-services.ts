import { BACKEND_URL } from "@/lib/constants";
import { userConfigs, userCreditGrants, userSettings } from "@repo/db";
import axios from "axios";

export type UserCreditGrant = typeof userCreditGrants.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type UserConfig = Pick<
  typeof userConfigs.$inferSelect,
  "id" | "user_id" | "config_type" | "created_at" | "updated_at"
>;
export type UserConfigType = UserConfig["config_type"];
export type UserConfigValue = Record<string, unknown>;
export type UserConfigDetail = UserConfig & { config: UserConfigValue };

export type GetUserCreditGrantsParams = {
  page?: number;
  limit?: number;
};

export type UserCreditGrantsResponse = {
  grants: UserCreditGrant[];
  page: number;
  hasNext: boolean;
};

export type UpdateUserSettingsPayload = {
  defaultPrModel?: string | null;
  defaultIssueFixerModel?: string | null;
  defaultCommentModel?: string | null;
  defaultModel?: string | null;
  telegramChatId?: number | null;
  defaultIssueInstanceAutoTerminateAfterMinutes?: number;
  defaultPrInstanceAutoTerminateAfterMinutes?: number;
  defaultManualInstanceAutoTerminateAfterMinutes?: number;
};

export const getUserMetadata = async (): Promise<{
  id: string;
  balance: number;
  username: string;
  firstName: string;
  lastName: string | null;
}> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/metadata`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const getUserSettings = async (): Promise<UserSettings | null> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/settings`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const getUserConfigs = async (): Promise<UserConfig[]> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/configs`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const getUserConfig = async (
  configType: UserConfigType,
): Promise<UserConfigDetail | null> => {
  const res = await axios.get(
    `${BACKEND_URL}/api/v1/users/configs/${configType}`,
    { withCredentials: true },
  );
  return res.data.data;
};

export const createUserConfig = async (payload: {
  configType: UserConfigType;
  config: UserConfigValue;
}): Promise<UserConfig> => {
  const res = await axios.post(`${BACKEND_URL}/api/v1/users/configs`, payload, {
    withCredentials: true,
  });
  return res.data.data;
};

export const updateUserConfig = async ({
  configType,
  config,
}: {
  configType: UserConfigType;
  config: UserConfigValue;
}): Promise<UserConfig> => {
  const res = await axios.put(
    `${BACKEND_URL}/api/v1/users/configs/${configType}`,
    { config },
    { withCredentials: true },
  );
  return res.data.data;
};

export const updateUserSettings = async (
  payload: UpdateUserSettingsPayload,
): Promise<UserSettings> => {
  const res = await axios.put(`${BACKEND_URL}/api/v1/users/settings`, payload, {
    withCredentials: true,
  });
  return res.data.data;
};

export const getUserCreditGrants = async ({
  page,
  limit,
}: GetUserCreditGrantsParams = {}): Promise<UserCreditGrantsResponse> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/credit-grants`, {
    params: {
      page,
      limit,
    },
    withCredentials: true,
  });
  return res.data.data;
};
