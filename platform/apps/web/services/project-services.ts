import { BACKEND_URL } from "@/lib/constants";
import { projects, proxyDomains } from "@repo/db";
import axios from "axios";

export const createProject = async (projectData: unknown) => {
  console.log(projectData);
  const res = await axios.post(BACKEND_URL + "/api/v1/projects", projectData, {
    withCredentials: true,
  });
  return res.data;
};

export const getProjects = async (): Promise<
  (typeof projects.$inferSelect)[]
> => {
  const res = await axios.get(BACKEND_URL + "/api/v1/projects", {
    withCredentials: true,
  });
  return res.data.data;
};

export const getProjectById = async (
  id: string,
): Promise<typeof projects.$inferSelect> => {
  const res = await axios.get(BACKEND_URL + `/api/v1/projects/${id}`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const deleteProject = async (id: string) => {
  const res = await axios.delete(BACKEND_URL + `/api/v1/projects/${id}`, {
    withCredentials: true,
  });
  return res.data;
};

export const getProjectDomainsById = async (
  id: string,
): Promise<(typeof proxyDomains.$inferSelect)[]> => {
  const res = await axios.get(BACKEND_URL + `/api/v1/projects/${id}/domain`, {
    withCredentials: true,
  });
  return res.data.data;
};
