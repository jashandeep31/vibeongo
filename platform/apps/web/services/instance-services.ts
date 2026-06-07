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

export const createInstance = async (
  data: CreateInstanceData,
): Promise<{ message: string }> => {
  const res = await axios.post(`${BACKEND_URL}/api/v1/instances`, data, {
    withCredentials: true,
  });
  return res.data;
};

export const getInstances = async ({
  running = false,
  includeProject = false,
}: {
  running?: boolean;
  includeProject?: boolean;
}): Promise<InstanceWithProject[]> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/instances`, {
    withCredentials: true,
    params: {
      running,
      include_project: includeProject,
    },
  });
  return res.data.data;
};

export const getInstancesByProjectId = async (
  projectId: string,
  state: ProjectInstanceStateFilter = "running",
): Promise<Instance[]> => {
  const res = await axios.get(
    `${BACKEND_URL}/api/v1/instances/project/${projectId}`,
    {
      withCredentials: true,
      params: { state },
    },
  );
  return res.data.data;
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
