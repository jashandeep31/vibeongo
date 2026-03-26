import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";
import { instances } from "@repo/db";

type Instance = typeof instances.$inferSelect;
export const createInstance = async (
  data: unknown,
): Promise<{ message: string }> => {
  const res = await axios.post(`${BACKEND_URL}/api/v1/instances`, data, {
    withCredentials: true,
  });
  return res.data;
};

export const getInstances = async (): Promise<Instance[]> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/instances`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const getInstancesByProjectId = async (
  projectId: string,
): Promise<Instance[]> => {
  const res = await axios.get(
    `${BACKEND_URL}/api/v1/instances/project/${projectId}`,
    {
      withCredentials: true,
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
