import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";
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

export const getInstances = async ({
  projectId,
  sessionId,
  state = "all",
  page = 1,
  limit = 10,
}: GetInstancesFilters = {}): Promise<GetInstancesResponse> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/instances`, {
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

export const terminateInstance = async (
  id: string,
): Promise<{ message: string }> => {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/instances/${id}`,
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

export const updateInstanceTime = async ({
  id,
  action,
  timeInMinutes,
}: UpdateInstanceTimeInput): Promise<typeof instances.$inferSelect> => {
  const response = await axios.patch(
    `${BACKEND_URL}/api/v1/instances/${id}`,
    {
      terminatesTimeUpdate: { action, timeInMinutes },
    },
    { withCredentials: true },
  );

  return response.data.data;
};
