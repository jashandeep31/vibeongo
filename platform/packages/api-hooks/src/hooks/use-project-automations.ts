import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

type GetProjectAutomationsParams = NonNullable<
  Parameters<ApiClient["projectAutomations"]["getProjectAutomations"]>[0]
>;
type GetProjectAutomationsResponse = Awaited<
  ReturnType<ApiClient["projectAutomations"]["getProjectAutomations"]>
>;

export const useGetProjectAutomations = (
  params: GetProjectAutomationsParams = {},
  enabled = true,
) => {
  const client = useApiClient();

  return useQuery<GetProjectAutomationsResponse>({
    queryKey: ["project-automations", params],
    queryFn: () => client.projectAutomations.getProjectAutomations(params),
    enabled,
  });
};

export const useGetProjectAutomation = (id: string | null, enabled = true) => {
  const client = useApiClient();

  return useQuery({
    queryKey: ["project-automation", id!],
    queryFn: () => client.projectAutomations.getProjectAutomation(id!),
    enabled: enabled && Boolean(id),
  });
};

export const useGetProjectAutomationRuns = (
  id: string | null,
  params: { page?: number; limit?: number } = {},
  enabled = true,
) => {
  const client = useApiClient();

  return useQuery({
    queryKey: ["project-automation-runs", id!, params],
    queryFn: () =>
      client.projectAutomations.getProjectAutomationRuns(id!, params),
    enabled: enabled && Boolean(id),
  });
};

export const useGetProjectAutomationTriggers = (
  id: string | null,
  enabled = true,
) => {
  const client = useApiClient();

  return useQuery({
    queryKey: ["project-automation-triggers", id!],
    queryFn: () => client.projectAutomations.getProjectAutomationTriggers(id!),
    enabled: enabled && Boolean(id),
  });
};

export const useCreateProjectAutomation = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectAutomations.createProjectAutomation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project-automations"] }),
  });
};

export const useUpdateProjectAutomation = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectAutomations.updateProjectAutomation,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project-automations"] }),
        queryClient.invalidateQueries({
          queryKey: ["project-automation", variables.id],
        }),
      ]);
    },
  });
};

export const useDeleteProjectAutomation = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectAutomations.deleteProjectAutomation,
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: ["project-automation", id] });
      await queryClient.invalidateQueries({
        queryKey: ["project-automations"],
      });
    },
  });
};

export const useRateProjectAutomationRun = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectAutomations.rateProjectAutomationRun,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project-automation-runs"] }),
  });
};

export const useTriggerProjectAutomation = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectAutomations.triggerProjectAutomation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project-automations"] }),
        queryClient.invalidateQueries({ queryKey: ["project-automation"] }),
        queryClient.invalidateQueries({
          queryKey: ["project-automation-runs"],
        }),
        queryClient.invalidateQueries({ queryKey: ["project-sessions"] }),
        queryClient.invalidateQueries({
          queryKey: ["projects", "with-sessions"],
        }),
        queryClient.invalidateQueries({ queryKey: ["instances"] }),
      ]);
    },
  });
};

export const useCreateProjectAutomationTrigger = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectAutomations.createProjectAutomationTrigger,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["project-automation", variables.automationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["project-automations"],
        }),
      ]);
    },
  });
};

export const useRotateProjectAutomationTriggerToken = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.projectAutomations.rotateProjectAutomationTriggerToken,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["project-automation-triggers", variables.automationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["project-automation", variables.automationId],
        }),
      ]);
    },
  });
};
