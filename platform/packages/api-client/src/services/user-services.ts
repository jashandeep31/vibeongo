import {
  userConfigs,
  userCreditGrants,
  users,
  userSettings,
  userWallet,
} from "@repo/db";
import type { AxiosInstance } from "axios";

type UserRow = typeof users.$inferSelect;

export type UserMetadata = Pick<UserRow, "id" | "username" | "tier"> & {
  balance: (typeof userWallet.$inferSelect)["balance"];
  firstName: UserRow["first_name"];
  lastName: UserRow["last_name"];
};

type UserConfigSummary = Omit<
  typeof userConfigs.$inferSelect,
  "iv" | "encrypted_config" | "tag"
>;
export type UserConfigValue = Record<string, unknown>;

type UserConfigPayload = {
  configType: (typeof userConfigs.$inferSelect)["config_type"];
  config: UserConfigValue;
};

export type GetUserCreditGrantsParams = {
  page?: number;
  limit?: number;
};

export type UpdateUserSettingsPayload = {
  defaultPrModel?: (typeof userSettings.$inferSelect)["default_pr_model"];
  defaultIssueFixerModel?: (typeof userSettings.$inferSelect)["default_issue_fixer_model"];
  defaultCommentModel?: (typeof userSettings.$inferSelect)["default_comment_model"];
  defaultModel?: (typeof userSettings.$inferSelect)["default_model"];
  telegramChatId?: (typeof userSettings.$inferSelect)["telegram_chat_id"];
  defaultIssueInstanceAutoTerminateAfterMinutes?: (typeof userSettings.$inferSelect)["default_issue_instance_auto_terminate_after_minutes"];
  defaultPrInstanceAutoTerminateAfterMinutes?: (typeof userSettings.$inferSelect)["default_pr_instance_auto_terminate_after_minutes"];
  defaultManualInstanceAutoTerminateAfterMinutes?: (typeof userSettings.$inferSelect)["default_manual_instance_auto_terminate_after_minutes"];
};

export const getUserMetadata =
  (apiClient: AxiosInstance) => async (): Promise<UserMetadata> => {
    const response = await apiClient.get(`/api/v1/users/metadata`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const getUserSettings =
  (apiClient: AxiosInstance) =>
  async (): Promise<typeof userSettings.$inferSelect | null> => {
    const response = await apiClient.get(`/api/v1/users/settings`, {
      withCredentials: true,
    });
    return response.data.data;
  };

export const updateUserSettings =
  (apiClient: AxiosInstance) =>
  async (
    payload: UpdateUserSettingsPayload,
  ): Promise<typeof userSettings.$inferSelect> => {
    const response = await apiClient.put(`/api/v1/users/settings`, payload, {
      withCredentials: true,
    });
    return response.data.data;
  };

export const getUserConfigs =
  (apiClient: AxiosInstance) => async (): Promise<UserConfigSummary[]> => {
    const response = await apiClient.get(`/api/v1/users/configs`, {
      withCredentials: true,
    });
    return response.data.data;
  };

export const getUserConfig =
  (apiClient: AxiosInstance) =>
  async (
    configType: (typeof userConfigs.$inferSelect)["config_type"],
  ): Promise<(UserConfigSummary & { config: UserConfigValue }) | null> => {
    const response = await apiClient.get(
      `/api/v1/users/configs/${configType}`,
      { withCredentials: true },
    );
    return response.data.data;
  };

export const createUserConfig =
  (apiClient: AxiosInstance) =>
  async (payload: UserConfigPayload): Promise<UserConfigSummary> => {
    const response = await apiClient.post(`/api/v1/users/configs`, payload, {
      withCredentials: true,
    });
    return response.data.data;
  };

export const updateUserConfig =
  (apiClient: AxiosInstance) =>
  async ({
    configType,
    config,
  }: UserConfigPayload): Promise<UserConfigSummary> => {
    const response = await apiClient.put(
      `/api/v1/users/configs/${configType}`,
      { config },
      { withCredentials: true },
    );
    return response.data.data;
  };

export const getUserCreditGrants =
  (apiClient: AxiosInstance) =>
  async ({ page, limit }: GetUserCreditGrantsParams = {}): Promise<{
    grants: (typeof userCreditGrants.$inferSelect)[];
    page: number;
    hasNext: boolean;
  }> => {
    const response = await apiClient.get(`/api/v1/users/credit-grants`, {
      params: { page, limit },
      withCredentials: true,
    });
    return response.data.data;
  };
