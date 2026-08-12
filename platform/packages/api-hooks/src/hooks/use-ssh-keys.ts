import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useSshKeys = (client: ApiClient) =>
  useQuery({ queryKey: ["ssh-keys"], queryFn: client.sshKeys.getSshKeys });

const useRefreshingMutation = <T>(mutationFn: (input: T) => Promise<void>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ssh-keys"] }),
  });
};

export const useCreateSshKey = (client: ApiClient) =>
  useRefreshingMutation(client.sshKeys.createSshKey);
export const useUpdateSshKey = (client: ApiClient) =>
  useRefreshingMutation(client.sshKeys.updateSshKey);
export const useDeleteSshKey = (client: ApiClient) =>
  useRefreshingMutation(client.sshKeys.deleteSshKey);
