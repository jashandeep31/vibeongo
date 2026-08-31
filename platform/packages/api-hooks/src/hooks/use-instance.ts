import type { ApiClient } from "@repo/api-client";
import { useSessionChatsStore, useSessionsStore } from "@repo/app-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

type GetInstancesFilters = NonNullable<
  Parameters<ApiClient["instances"]["getInstances"]>[0]
>;

export const useGetInstances = (
  filters: GetInstancesFilters = {},
  enabled = true,
) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["instances", filters],
    queryFn: () => client.instances.getInstances(filters),
    enabled,
  });
};

export const useTerminateInstance = (projectId: string, sessionId: string) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.instances.terminateInstance,
    onSuccess: (_, instanceId) => {
      useSessionChatsStore.getState().clearSessionChats(sessionId);
      useSessionsStore.getState().updateSession(sessionId, {
        instance: null,
        state: "stopped",
        instanceSyncState: "success",
      });
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
        queryKey: ["projects", "with-sessions"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["project-session", sessionId],
      });
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
};

export const useUpdateInstanceTime = (sessionId: string) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.instances.updateInstanceTime,
    onSuccess: (instance) => {
      useSessionsStore.getState().updateSession(sessionId, { instance });
      queryClient.setQueryData(["instance", instance.id], instance);
      return queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });
};
