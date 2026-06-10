import {
  addTaskToProjectSession,
  archiveProjectSession,
  deleteProjectSessionTask,
  GetProjectSessionsParams,
  getProjectSessionById,
  getProjectSessions,
  resumeProjectSession,
  updateProjectSessionTask,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      queryClient.invalidateQueries({
        queryKey: ["project-session", variables.id],
      });
    },
  });
};

export const useAddTaskToProjectSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addTaskToProjectSession,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      queryClient.invalidateQueries({
        queryKey: ["project-session", variables.id],
      });
    },
  });
};

export const useUpdateProjectSessionTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProjectSessionTask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      queryClient.invalidateQueries({
        queryKey: ["project-session", variables.id],
      });
    },
  });
};

export const useDeleteProjectSessionTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProjectSessionTask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-sessions"] });
      queryClient.invalidateQueries({
        queryKey: ["project-session", variables.id],
      });
    },
  });
};
