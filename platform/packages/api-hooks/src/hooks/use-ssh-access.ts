import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

const accessKey = (instanceId: string) => [
  "ssh-access",
  instanceId,
];

export const useSshAccess = (instanceId: string, enabled = true) => {
  const client = useApiClient();
  return useQuery({
    queryKey: accessKey(instanceId),
    queryFn: () => client.sshAccess.listSshAccess(instanceId),
    enabled: enabled && Boolean(instanceId),
    refetchOnMount: "always",
  });
};

export const useCreateSshAccess = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) =>
      client.sshAccess.createSshAccess(instanceId),
    onSuccess: (_data, instanceId) =>
      queryClient.invalidateQueries({ queryKey: accessKey(instanceId) }),
  });
};

export const useRevokeSshAccess = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { instanceId: string; accessId: string }) =>
      client.sshAccess.revokeSshAccess(input),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: accessKey(input.instanceId),
      }),
  });
};
