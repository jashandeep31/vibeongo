import { isAxiosError, type AxiosInstance } from "axios";
import { instances, instanceState } from "@repo/db";
import { createInstanceSchema, type z } from "@repo/shared";

export type CreateInstanceInput = z.input<typeof createInstanceSchema>;

export type CreateInstanceResponse = {
  message: string;
  data: { sessionId: string };
};

export const createInstance =
  (apiClient: AxiosInstance) =>
  async (input: CreateInstanceInput): Promise<CreateInstanceResponse> => {
    const response = await apiClient.post(`/api/v1/instances`, input, {
      withCredentials: true,
    });
    return response.data;
  };

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

export const suspendInstance =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `/api/v1/instances/${id}/suspend`,
      undefined,
      { withCredentials: true },
    );

    return response.data;
  };

export type UpdateInstanceTimeInput = {
  id: string;
  action: "increase" | "decrease";
  timeInMinutes: number;
  requestId?: string;
};

export const updateInstanceTime =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    action,
    timeInMinutes,
    requestId,
  }: UpdateInstanceTimeInput): Promise<typeof instances.$inferSelect> => {
    try {
      const response = await apiClient.patch(
        `/api/v1/instances/${id}`,
        { terminatesTimeUpdate: { action, timeInMinutes, requestId } },
        { withCredentials: true },
      );
      return response.data.data;
    } catch (error) {
      if (
        isAxiosError(error) &&
        typeof error.response?.data?.message === "string"
      ) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  };
