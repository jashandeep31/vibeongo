import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";
import { instances } from "@repo/db";
import { z } from "@repo/shared";
import { createInstanceSchema } from "@repo/shared";

type Instance = typeof instances.$inferSelect;
export type InstanceProject = {
  id: string;
  name: string;
  user_id: string;
};
export type InstanceWithProject = Instance & {
  project: InstanceProject | null;
};
type CreateInstanceData = z.infer<typeof createInstanceSchema>;
export type ProjectInstanceStateFilter = "running" | "terminated" | "all";
export type GetInstancesFilters = {
  projectId?: string;
  sessionId?: string;
  state?: ProjectInstanceStateFilter;
  includeProject?: boolean;
  page?: number;
  limit?: number;
};
export type GetInstancesResponse = {
  data: InstanceWithProject[];
  page: number;
  hasNext: boolean;
};

export const createInstance = async (
  data: CreateInstanceData,
): Promise<{ message: string }> => {
  const res = await axios.post(`${BACKEND_URL}/api/v1/instances`, data, {
    withCredentials: true,
  });
  return res.data;
};

export const getInstances = async ({
  projectId,
  sessionId,
  state = "all",
  includeProject = false,
  page = 1,
  limit = 10,
}: GetInstancesFilters = {}): Promise<GetInstancesResponse> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/instances`, {
    withCredentials: true,
    params: {
      project_id: projectId,
      session_id: sessionId,
      state,
      include_project: includeProject,
      page,
      limit,
    },
  });
  return res.data;
};

export const getInstanceById = async (id: string): Promise<Instance> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/instances/${id}`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const terminateInstance = async (
  id: string,
): Promise<{ message: string }> => {
  const res = await axios.post(
    `${BACKEND_URL}/api/v1/instances/${id}`,
    undefined,
    {
      withCredentials: true,
    },
  );
  return res.data;
};

export type UpdateInstanceTimeData = {
  id: string;
  action: "increase" | "decrease";
  timeInMinutes: number;
};

export const updateInstanceTime = async ({
  id,
  action,
  timeInMinutes,
}: UpdateInstanceTimeData): Promise<Instance> => {
  const res = await axios.patch(
    `${BACKEND_URL}/api/v1/instances/${id}`,
    {
      terminatesTimeUpdate: { action, timeInMinutes },
    },
    { withCredentials: true },
  );

  return res.data.data;
};
