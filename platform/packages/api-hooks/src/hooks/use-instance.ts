import type { ApiClient } from "@repo/api-client";
import { useSessionChatsStore, useSessionsStore } from "@repo/app-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";
import { useRef } from "react";

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

export const useSuspendInstance = (projectId: string, sessionId: string) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.instances.suspendInstance,
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
  const request = useRef<{ key: string; id: string } | null>(null);

  return useMutation({
    mutationFn: (
      input: Parameters<ApiClient["instances"]["updateInstanceTime"]>[0],
    ) => {
      const key = JSON.stringify([input.id, input.action, input.timeInMinutes]);
      if (request.current?.key !== key) {
        request.current = {
          key,
          id: `time-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
      }
      return client.instances.updateInstanceTime({
        ...input,
        requestId: input.requestId ?? request.current.id,
      });
    },
    onSuccess: async (instance) => {
      request.current = null;
      // Cancel older reads before publishing the authoritative saved expiration.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["instances"] }),
        queryClient.cancelQueries({ queryKey: ["instance", instance.id] }),
        queryClient.cancelQueries({ queryKey: ["project-sessions"] }),
        queryClient.cancelQueries({ queryKey: ["project-session", sessionId] }),
        queryClient.cancelQueries({ queryKey: ["projects", "with-sessions"] }),
      ]);
      useSessionsStore.getState().updateSession(sessionId, { instance });
      queryClient.setQueryData(["instance", instance.id], instance);
      queryClient.setQueriesData<{ data: (typeof instance)[] }>(
        { queryKey: ["instances"] },
        (previous) =>
          previous
            ? {
                ...previous,
                data: previous.data.map((row) =>
                  row.id === instance.id ? { ...row, ...instance } : row,
                ),
              }
            : previous,
      );
      void queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
      void queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      void queryClient.invalidateQueries({
        queryKey: ["project-session", sessionId],
      });
      return queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
    onError: () => {
      // A retry can reconcile an accepted provider operation; refresh its state.
      void queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });
};
