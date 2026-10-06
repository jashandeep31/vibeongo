import type { notifications, pushTokens } from "@repo/db";
import type { AxiosInstance } from "axios";

export type PushToken = typeof pushTokens.$inferSelect;
export type AppNotification = typeof notifications.$inferSelect;

export type GetNotificationsParams = {
  page?: number;
  limit?: number;
  unread?: boolean;
};

export type GetNotificationsResponse = {
  notifications: AppNotification[];
  has_next: boolean;
  page: number;
};

export const getNotifications =
  (apiClient: AxiosInstance) =>
  async (
    params: GetNotificationsParams = {},
  ): Promise<GetNotificationsResponse> => {
    const response = await apiClient.get(`/api/v1/notifications`, {
      params: {
        ...params,
        ...(params.unread !== undefined
          ? { unread: String(params.unread) }
          : {}),
      },
      withCredentials: true,
    });
    return response.data.data;
  };

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

export const markNotificationRead =
  (apiClient: AxiosInstance) => async (id: string) => {
    await apiClient.patch(`/api/v1/notifications/${id}/read`, undefined, {
      withCredentials: true,
    });
  };

export const getUnreadNotificationCount =
  (apiClient: AxiosInstance) => async (): Promise<number> => {
    const response = await apiClient.get(
      `/api/v1/notifications/unread-count`,
      { withCredentials: true },
    );
    return response.data.data.count;
  };

export const markAllNotificationsRead =
  (apiClient: AxiosInstance) => async () => {
    await apiClient.patch(`/api/v1/notifications/read-all`, undefined, {
      withCredentials: true,
    });
  };
