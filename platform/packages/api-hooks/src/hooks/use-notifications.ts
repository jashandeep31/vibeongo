import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

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
