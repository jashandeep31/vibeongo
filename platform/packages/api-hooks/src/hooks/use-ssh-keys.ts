import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

export const useSshKeys = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["ssh-keys"],
    queryFn: client.sshKeys.getSshKeys,
  });
};

const useRefreshingMutation = <T>(mutationFn: (input: T) => Promise<void>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ssh-keys"] }),
  });
};

export const useCreateSshKey = () => {
  const client = useApiClient();
  return useRefreshingMutation(client.sshKeys.createSshKey);
};
export const useUpdateSshKey = () => {
  const client = useApiClient();
  return useRefreshingMutation(client.sshKeys.updateSshKey);
};
export const useDeleteSshKey = () => {
  const client = useApiClient();
  return useRefreshingMutation(client.sshKeys.deleteSshKey);
};
