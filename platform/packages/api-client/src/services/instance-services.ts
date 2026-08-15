import type { AxiosInstance } from "axios";
import { instances, instanceState } from "@repo/db";

export type GetInstancesFilters = {
  projectId?: string;
  sessionId?: string;
  state?: (typeof instanceState.enumValues)[number] | "all";
  page?: number;
  limit?: number;
};

export type GetInstancesResponse = {
  data: (typeof instances.$inferSelect)[];
  page: number;
  hasNext: boolean;
};

export const getInstances =
  (apiClient: AxiosInstance) =>
  async ({
    projectId,
    sessionId,
    state = "all",
    page = 1,
    limit = 10,
  }: GetInstancesFilters = {}): Promise<GetInstancesResponse> => {
    const response = await apiClient.get(`/api/v1/instances`, {
      withCredentials: true,
      params: {
        project_id: projectId,
        session_id: sessionId,
        state,
        page,
        limit,
      },
    });

    return response.data;
  };

export const terminateInstance =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `/api/v1/instances/${id}`,
      undefined,
      { withCredentials: true },
    );

    return response.data;
  };

export type UpdateInstanceTimeInput = {
  id: string;
  action: "increase" | "decrease";
  timeInMinutes: number;
};

export const updateInstanceTime =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    action,
    timeInMinutes,
  }: UpdateInstanceTimeInput): Promise<typeof instances.$inferSelect> => {
    const response = await apiClient.patch(
      `/api/v1/instances/${id}`,
      {
        terminatesTimeUpdate: { action, timeInMinutes },
      },
      { withCredentials: true },
    );

    return response.data.data;
  };
