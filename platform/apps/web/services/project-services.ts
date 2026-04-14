import { BACKEND_URL } from "@/lib/constants";
import {
  projectDomainRouting,
  projects,
  proxyDomains,
  routingAllowedIps,
} from "@repo/db";
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

type GetProjectDomains = typeof projectDomainRouting.$inferSelect & {
  proxy_domains: (typeof proxyDomains.$inferSelect)[];
  allowed_ips: (typeof routingAllowedIps.$inferSelect)[];
};

type AddAllowedIpInput = {
  id: string;
  ip: string;
};

type DeleteAllowedIpInput = {
  id: string;
  ipId: string;
};

export const getProjectDomainsById = async (
  id: string,
): Promise<GetProjectDomains> => {
  const res = await axios.get(BACKEND_URL + `/api/v1/projects/${id}/domains`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const addAllowedIpToProject = async ({
  id,
  ip,
}: AddAllowedIpInput): Promise<{ message: string }> => {
  const res = await axios.post(
    BACKEND_URL + `/api/v1/projects/${id}/allowed-ips`,
    { ip },
    {
      withCredentials: true,
    },
  );

  return res.data;
};

export const deleteAllowedIpFromProject = async ({
  id,
  ipId,
}: DeleteAllowedIpInput): Promise<{ message: string }> => {
  const res = await axios.delete(
    BACKEND_URL + `/api/v1/projects/${id}/allowed-ips/${ipId}`,
    {
      withCredentials: true,
    },
  );

  return res.data;
};
