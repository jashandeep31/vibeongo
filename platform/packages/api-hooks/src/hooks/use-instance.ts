import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type GetInstancesFilters = NonNullable<
  Parameters<ApiClient["instances"]["getInstances"]>[0]
>;

export const useGetInstances = (
  client: ApiClient,
  filters: GetInstancesFilters = {},
  enabled = true,
) =>
  useQuery({
    queryKey: ["instances", filters],
    queryFn: () => client.instances.getInstances(filters),
    enabled,
  });

export const useTerminateInstance = (
  client: ApiClient,
  projectId: string,
  sessionId: string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.instances.terminateInstance,
    onSuccess: (_, instanceId) => {
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === "opencode" &&
          query.queryKey.includes(sessionId),
      });
      void queryClient.invalidateQueries({ queryKey: ["instances"] });
      void queryClient.invalidateQueries({
        queryKey: ["instance", instanceId],
      });
      void queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      void queryClient.invalidateQueries({
        queryKey: ["project-session", sessionId],
      });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
};

export const useUpdateInstanceTime = (client: ApiClient) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.instances.updateInstanceTime,
    onSuccess: (instance) => {
      queryClient.setQueryData(["instance", instance.id], instance);
      return queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });
};
