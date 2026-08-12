import type { ApiClient } from "@repo/api-client";
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
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      }),
  });
};

export const useResumeProjectSession = (client: ApiClient) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectSessions.resumeProjectSession,
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      void queryClient.invalidateQueries({
        queryKey: ["projects", "with-sessions"],
      });
    },
  });
};
