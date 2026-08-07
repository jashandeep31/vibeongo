import {
  createProjectSession,
  getProjectSessions,
  resumeProjectSession,
  type GetProjectSessionsParams,
  type ProjectSessionsResponse,
} from "@/services/project-session-services";
import { useSessionsStore } from "@/store/playground-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetProjectSessions = (
  params: GetProjectSessionsParams = {},
  enabled = true,
) =>
  useQuery<ProjectSessionsResponse>({
    queryKey: ["project-sessions", params],
    queryFn: () => getProjectSessions(params),
    enabled,
  });

export const useCreateProjectSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProjectSession,
    onSuccess: ({ data: session }) => {
      useSessionsStore.getState().addSession({
        session,
        instance: null,
        state: "stopped",
      });
      return queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};

export const useResumeProjectSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeProjectSession,
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
      queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });
};
