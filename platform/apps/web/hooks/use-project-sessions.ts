import {
  archiveProjectSession,
  GetProjectSessionsParams,
  getProjectSessionById,
  getProjectSessions,
  resumeProjectSession,
} from "@/services/project-session-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetProjectSessions = (
  params: GetProjectSessionsParams = {},
  enabled = true,
) =>
  useQuery({
    queryKey: ["project-sessions", params],
    queryFn: () => getProjectSessions(params),
    enabled,
  });

export const useGetProjectSessionById = (id: string) =>
  useQuery({
    queryKey: ["project-session", id],
    queryFn: () => getProjectSessionById(id),
    enabled: !!id,
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

export const useArchiveProjectSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveProjectSession,
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      queryClient.invalidateQueries({
        queryKey: ["project-session", sessionId],
      });
    },
  });
};
