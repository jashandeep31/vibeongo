import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export type Instance = {
  id: string;
  project_id: string | null;
  project_session_id: string | null;
  state: "running" | "terminated";
};

export type GetInstancesFilters = {
  projectId?: string;
  sessionId?: string;
  state?: "running" | "terminated" | "all";
  page?: number;
  limit?: number;
};

export type GetInstancesResponse = {
  data: Instance[];
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
