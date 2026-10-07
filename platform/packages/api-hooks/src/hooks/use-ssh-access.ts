import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

const accessKey = (projectSessionId: string) => [
  "ssh-access",
  projectSessionId,
];

export const useSshAccess = (projectSessionId: string, enabled = true) => {
  const client = useApiClient();
  return useQuery({
    queryKey: accessKey(projectSessionId),
    queryFn: () => client.sshAccess.listSshAccess(projectSessionId),
    enabled: enabled && Boolean(projectSessionId),
    refetchOnMount: "always",
  });
};

export const useCreateSshAccess = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectSessionId: string) =>
      client.sshAccess.createSshAccess(projectSessionId),
    onSuccess: (_data, projectSessionId) =>
      queryClient.invalidateQueries({ queryKey: accessKey(projectSessionId) }),
  });
};

export const useRevokeSshAccess = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectSessionId: string; accessId: string }) =>
      client.sshAccess.revokeSshAccess(input),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: accessKey(input.projectSessionId),
      }),
  });
};
