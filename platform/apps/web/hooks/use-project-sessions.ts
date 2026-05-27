import {
  GetProjectSessionsParams,
  getProjectSessions,
  resumeProjectSession,
} from "@/services/project-session-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetProjectSessions = (params: GetProjectSessionsParams = {}) =>
  useQuery({
    queryKey: ["project-sessions", params],
    queryFn: () => getProjectSessions(params),
  });

export const useResumeProjectSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeProjectSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      // Depending on structure, you might invalidate instances or projects here too
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });
};
