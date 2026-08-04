import { BACKEND_URL } from "@/lib/constants";
import {
  githubRepos,
  projectDomainRouting,
  projects,
  projectSessions,
  proxyDomains,
  routingAllowedIps,
} from "@repo/db";
import axios from "axios";

export type Project = typeof projects.$inferSelect;
export type ProjectWithSessions = Project & {
  sessions: (typeof projectSessions.$inferSelect)[];
};

export type ProjectDomains = typeof projectDomainRouting.$inferSelect & {
  proxy_domains: (typeof proxyDomains.$inferSelect)[];
  allowed_ips: (typeof routingAllowedIps.$inferSelect)[];
};

export type ProjectGithubRepo = Pick<
  typeof githubRepos.$inferSelect,
  "id" | "full_name"
>;

export const getProjects = async (): Promise<Project[]> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/projects`, {
    withCredentials: true,
  });

  return response.data.data;
};

export const getProjectsWithSessions = async (): Promise<
  ProjectWithSessions[]
> => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/projects/with-sessions`,
    { withCredentials: true },
  );

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

export const getProjectGithubReposById = async (
  id: string,
): Promise<ProjectGithubRepo[]> => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/projects/${id}/github-repos`,
    { withCredentials: true },
  );

  return response.data.data;
};
