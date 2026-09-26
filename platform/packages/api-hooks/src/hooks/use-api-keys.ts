import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GetApiKeysParams } from "@repo/api-client";
import { useApiClient } from "../api-client-context.js";

export const useApiKeys = (params: GetApiKeysParams = {}) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["api-keys", params],
    queryFn: () => client.apiKeys.getApiKeys(params),
  });
};

export const useCreateApiKey = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.apiKeys.createApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
};

export const useDeleteApiKey = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.apiKeys.deleteApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
};
