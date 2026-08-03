import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export type Project = {
  id: string;
  name: string;
  description: string | null;
};

export type ProjectDomains = {
  target_instance_id: string | null;
  proxy_domains: {
    id: string;
    domain: string;
    target_port: number;
  }[];
};

export const getProjects = async (): Promise<Project[]> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/projects`, {
    withCredentials: true,
  });

  return response.data.data;
};

export const getProjectDomainsById = async (
  id: string,
): Promise<ProjectDomains> => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/projects/${id}/domains`,
    { withCredentials: true },
  );

  return response.data.data;
};
