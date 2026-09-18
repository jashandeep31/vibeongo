import {
  projectAutomationRuns,
  projectAutomations,
  projectAutomationTasks,
  projectSessions,
} from "@repo/db";
import {
  projectAutomationSchema,
  projectAutomationTaskSchema,
  type z,
} from "@repo/shared";
import type { AxiosInstance } from "axios";

export type ProjectAutomation = typeof projectAutomations.$inferSelect;
export type ProjectAutomationTask = typeof projectAutomationTasks.$inferSelect;
export type ProjectAutomationRun = typeof projectAutomationRuns.$inferSelect & {
  project_session: typeof projectSessions.$inferSelect | null;
};

export type CreateProjectAutomationInput = z.infer<
  typeof projectAutomationSchema
> & {
  tasks: z.infer<typeof projectAutomationTaskSchema>[];
};

export type GetProjectAutomationsParams = {
  page?: number;
  limit?: number;
};

export type GetProjectAutomationsResponse = {
  automations: Array<
    ProjectAutomation & {
      project_name: string;
    }
  >;
  has_next: boolean;
  page: number;
};

export type GetProjectAutomationResponse = {
  project_automation: ProjectAutomation & {
    project_name: string;
  };
  tasks: ProjectAutomationTask[];
};

export type GetProjectAutomationRunsParams = {
  page?: number;
  limit?: number;
};

export type GetProjectAutomationRunsResponse = {
  runs: ProjectAutomationRun[];
  has_next: boolean;
  page: number;
};

export type RateProjectAutomationRunInput = {
  automationId: ProjectAutomation["id"];
  runId: ProjectAutomationRun["id"];
  rating: number;
  feedback?: string;
};

export type RateProjectAutomationRunResponse = {
  message: string;
  data: typeof projectAutomationRuns.$inferSelect;
};

export type CreateProjectAutomationResponse = {
  message: string;
};

export type UpdateProjectAutomationInput = {
  id: ProjectAutomation["id"];
  input: CreateProjectAutomationInput;
};

export type UpdateProjectAutomationResponse = {
  message: string;
  data: GetProjectAutomationResponse;
};

export type DeleteProjectAutomationResponse = {
  message: string;
};

export type TriggerProjectAutomationResponse = {
  message: string;
};

export const getProjectAutomations =
  (apiClient: AxiosInstance) =>
  async (
    params: GetProjectAutomationsParams = {},
  ): Promise<GetProjectAutomationsResponse> => {
    const response = await apiClient.get(`/api/v1/project-automations`, {
      params,
      withCredentials: true,
    });

    return response.data.data;
  };

export const getProjectAutomation =
  (apiClient: AxiosInstance) =>
  async (
    id: ProjectAutomation["id"],
  ): Promise<GetProjectAutomationResponse> => {
    const response = await apiClient.get(`/api/v1/project-automations/${id}`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const getProjectAutomationRuns =
  (apiClient: AxiosInstance) =>
  async (
    id: ProjectAutomation["id"],
    params: GetProjectAutomationRunsParams = {},
  ): Promise<GetProjectAutomationRunsResponse> => {
    const response = await apiClient.get(
      `/api/v1/project-automations/${id}/runs`,
      { params, withCredentials: true },
    );

    return response.data.data;
  };

export const rateProjectAutomationRun =
  (apiClient: AxiosInstance) =>
  async ({
    automationId,
    runId,
    rating,
    feedback,
  }: RateProjectAutomationRunInput): Promise<RateProjectAutomationRunResponse> => {
    const response = await apiClient.patch(
      `/api/v1/project-automations/${automationId}/runs/${runId}/rating`,
      { rating, feedback },
      { withCredentials: true },
    );

    return response.data;
  };

export const createProjectAutomation =
  (apiClient: AxiosInstance) =>
  async (
    input: CreateProjectAutomationInput,
  ): Promise<CreateProjectAutomationResponse> => {
    const response = await apiClient.post(
      `/api/v1/project-automations`,
      input,
      { withCredentials: true },
    );

    return response.data;
  };

export const updateProjectAutomation =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    input,
  }: UpdateProjectAutomationInput): Promise<UpdateProjectAutomationResponse> => {
    const response = await apiClient.patch(
      `/api/v1/project-automations/${id}`,
      input,
      { withCredentials: true },
    );

    return response.data;
  };

export const deleteProjectAutomation =
  (apiClient: AxiosInstance) =>
  async (
    id: ProjectAutomation["id"],
  ): Promise<DeleteProjectAutomationResponse> => {
    const response = await apiClient.delete(
      `/api/v1/project-automations/${id}`,
      { withCredentials: true },
    );

    return response.data;
  };

export const triggerProjectAutomation =
  (apiClient: AxiosInstance) =>
  async (
    id: ProjectAutomation["id"],
  ): Promise<TriggerProjectAutomationResponse> => {
    const response = await apiClient.post(
      `/api/v1/project-automations/${id}/trigger`,
      undefined,
      { withCredentials: true },
    );

    return response.data;
  };
