import type { pushTokens } from "@repo/db";
import type { AxiosInstance } from "axios";

export type PushToken = typeof pushTokens.$inferSelect;

export type UpsertPushTokenInput = Pick<
  typeof pushTokens.$inferInsert,
  "token" | "platform"
> & { enabled: boolean };

export const upsertPushToken =
  (apiClient: AxiosInstance) =>
  async (input: UpsertPushTokenInput): Promise<PushToken> => {
    const response = await apiClient.put(
      `/api/v1/notifications/push-tokens`,
      input,
      { withCredentials: true },
    );
    return response.data.data;
  };

export const deletePushToken =
  (apiClient: AxiosInstance) => async (token: string) => {
    await apiClient.delete(`/api/v1/notifications/push-tokens`, {
      data: { token },
      withCredentials: true,
    });
  };
