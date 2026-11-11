import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

export const useProviderCredentials = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["provider-credentials"],
    queryFn: () => client.providerCredentials.getProviderCredentials(),
  });
};

export const useDeleteProviderCredentials = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: client.providerCredentials.deleteProviderCredentials,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["provider-credentials"] }),
  });
};
