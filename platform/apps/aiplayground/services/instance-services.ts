import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";
import { instances } from "@repo/db";
export type GetInstancesFilters = {
  projectId?: string;
  sessionId?: string;
  state?: "running" | "terminated" | "all";
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
