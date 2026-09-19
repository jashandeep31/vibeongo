import {
  projectAutomationRuns,
  projectAutomations,
  projectAutomationTasks,
  projectAutomationTriggers,
  projectSessions,
  instances,
} from "@repo/db";
import {
  projectAutomationSchema,
  projectAutomationTaskSchema,
  type z,
} from "@repo/shared";
import type { AxiosInstance } from "axios";

export type ProjectAutomation = typeof projectAutomations.$inferSelect;
export type ProjectAutomationTask = typeof projectAutomationTasks.$inferSelect;
export type ProjectAutomationTrigger =
  typeof projectAutomationTriggers.$inferSelect;
export type ProjectAutomationRun = typeof projectAutomationRuns.$inferSelect & {
  project_session:
    | (typeof projectSessions.$inferSelect & {
        instance: typeof instances.$inferSelect | null;
      })
    | null;
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
  data: {
    automation_run_id: ProjectAutomationRun["id"];
  };
};

export type CreateProjectAutomationTriggerInput = {
  automationId: ProjectAutomation["id"];
  name: string;
  provider: "sentry" | "custom";
};

export type CreateProjectAutomationTriggerResponse = {
  message: string;
  data: {
    trigger: Pick<
      ProjectAutomationTrigger,
      "id" | "name" | "provider" | "project_automation_id" | "created_at"
    >;
    secret: string;
    webhook_url: string;
  };
};

export type GetProjectAutomationTriggersResponse = {
  triggers: Array<
    Pick<
      ProjectAutomationTrigger,
      | "id"
      | "name"
      | "provider"
      | "project_automation_id"
      | "lasted_triggered_at"
      | "created_at"
      | "updated_at"
    > & { webhook_url: string }
  >;
};

export type RotateProjectAutomationTriggerTokenInput = {
  automationId: ProjectAutomation["id"];
  triggerId: ProjectAutomationTrigger["id"];
};

export type DeleteProjectAutomationTriggerResponse = {
  message: string;
};

export type RotateProjectAutomationTriggerTokenResponse = {
  message: string;
  data: {
    trigger: Pick<
      ProjectAutomationTrigger,
      "id" | "name" | "project_automation_id" | "updated_at"
    >;
    secret: string;
    webhook_url: string;
  };
};

export type GetProjectAutomationTriggerRunsParams = {
  page?: number;
  limit?: number;
};

export type GetProjectAutomationTriggerResponse = {
  trigger: Pick<
    ProjectAutomationTrigger,
    | "id"
    | "name"
    | "provider"
    | "project_automation_id"
    | "lasted_triggered_at"
    | "created_at"
    | "updated_at"
  > & { webhook_url: string };
  runs: ProjectAutomationRun[];
  has_next: boolean;
  page: number;
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
  }: RateProjectAutomationRunInput): Promise<RateProjectAutomationRunResponse> => {
    const response = await apiClient.patch(
      `/api/v1/project-automations/${automationId}/runs/${runId}/rating`,
      { rating },
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

export const createProjectAutomationTrigger =
  (apiClient: AxiosInstance) =>
  async ({
    automationId,
    name,
    provider,
  }: CreateProjectAutomationTriggerInput): Promise<CreateProjectAutomationTriggerResponse> => {
    const response = await apiClient.post(
      `/api/v1/project-automations/${automationId}/triggers`,
      { name, provider },
      { withCredentials: true },
    );

    return response.data;
  };

export const getProjectAutomationTriggers =
  (apiClient: AxiosInstance) =>
  async (
    id: ProjectAutomation["id"],
  ): Promise<GetProjectAutomationTriggersResponse> => {
    const response = await apiClient.get(
      `/api/v1/project-automations/${id}/triggers`,
      { withCredentials: true },
    );

    return response.data.data;
  };

export const rotateProjectAutomationTriggerToken =
  (apiClient: AxiosInstance) =>
  async ({
    automationId,
    triggerId,
  }: RotateProjectAutomationTriggerTokenInput): Promise<RotateProjectAutomationTriggerTokenResponse> => {
    const response = await apiClient.post(
      `/api/v1/project-automations/${automationId}/triggers/${triggerId}/rotate-token`,
      undefined,
      { withCredentials: true },
    );

    return response.data;
  };

export const deleteProjectAutomationTrigger =
  (apiClient: AxiosInstance) =>
  async (
    automationId: ProjectAutomation["id"],
    triggerId: ProjectAutomationTrigger["id"],
  ): Promise<DeleteProjectAutomationTriggerResponse> => {
    const response = await apiClient.delete(
      `/api/v1/project-automations/${automationId}/triggers/${triggerId}`,
      { withCredentials: true },
    );

    return response.data;
  };

export const getProjectAutomationTrigger =
  (apiClient: AxiosInstance) =>
  async (
    automationId: ProjectAutomation["id"],
    triggerId: ProjectAutomationTrigger["id"],
    params: GetProjectAutomationTriggerRunsParams = {},
  ): Promise<GetProjectAutomationTriggerResponse> => {
    const response = await apiClient.get(
      `/api/v1/project-automations/${automationId}/triggers/${triggerId}`,
      { params, withCredentials: true },
    );

    return response.data.data;
  };
