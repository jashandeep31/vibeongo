import {
  getProjectSessions,
  resumeProjectSession,
  type GetProjectSessionsParams,
  type ProjectSessionsResponse,
} from "@/services/project-session-services";
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

export const useResumeProjectSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeProjectSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });
};
