import type { GetNotificationsParams } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

export const UNREAD_NOTIFICATION_COUNT_QUERY_KEY = [
  "notifications",
  "unread-count",
] as const;

export const useNotifications = (params: GetNotificationsParams = {}) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["notifications", "list", params],
    queryFn: () => client.notifications.getNotifications(params),
  });
};

export const useUnreadNotificationCount = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: UNREAD_NOTIFICATION_COUNT_QUERY_KEY,
    queryFn: client.notifications.getUnreadNotificationCount,
  });
};

export const useUpsertPushToken = () => {
  const client = useApiClient();
  return useMutation({
    mutationFn: client.notifications.upsertPushToken,
  });
};

export const useDeletePushToken = () => {
  const client = useApiClient();
  return useMutation({
    mutationFn: client.notifications.deletePushToken,
  });
};

export const useMarkNotificationRead = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.notifications.markNotificationRead,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: UNREAD_NOTIFICATION_COUNT_QUERY_KEY,
      }),
  });
};

// only the unread count is refreshed: the notifications page keeps showing
// the ones that were unread when it opened
export const useMarkAllNotificationsRead = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.notifications.markAllNotificationsRead,
    onSuccess: () =>
      queryClient.setQueryData(UNREAD_NOTIFICATION_COUNT_QUERY_KEY, 0),
  });
};
