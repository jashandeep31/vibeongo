import type { ApiClient } from "@repo/api-client";
import { useSessionsStore } from "@repo/app-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type GetProjectSessionsParams = NonNullable<
  Parameters<ApiClient["projectSessions"]["getProjectSessions"]>[0]
>;
type ProjectSessionsResponse = Awaited<
  ReturnType<ApiClient["projectSessions"]["getProjectSessions"]>
>;

export const useGetProjectSessions = (
  client: ApiClient,
  params: GetProjectSessionsParams = {},
  enabled = true,
) =>
  useQuery<ProjectSessionsResponse>({
    queryKey: ["project-sessions", params],
    queryFn: () => client.projectSessions.getProjectSessions(params),
    enabled,
  });

export const useCreateProjectSession = (client: ApiClient) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectSessions.createProjectSession,
    onSuccess: ({ data: session }) => {
      useSessionsStore.getState().addSession({
        session,
        instance: null,
        state: "stopped",
        instanceSyncState: "pending",
      });
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useResumeProjectSession = (client: ApiClient) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectSessions.resumeProjectSession,
    onMutate: ({ id }) => {
      const previousState = useSessionsStore
        .getState()
        .sessions.find((entry) => entry.session.id === id)?.state;
      useSessionsStore.getState().updateSessionState(id, "processing");
      return { id, previousState };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousState) {
        useSessionsStore
          .getState()
          .updateSessionState(context.id, context.previousState);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });
};

export const useArchiveProjectSession = (client: ApiClient) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectSessions.archiveProjectSession,
    onSuccess: (_, variables) => {
      useSessionsStore.getState().deleteSession(variables.id);
      void queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      void queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};
