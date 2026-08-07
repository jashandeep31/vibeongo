import { BACKEND_URL } from "@/lib/constants";
import {
  githubRepos,
  instances,
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

export type UpdateProjectRoutingTargetInstanceInput = {
  id: (typeof projects.$inferSelect)["id"];
  instanceId: (typeof instances.$inferSelect)["id"];
};

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

export const updateProjectRoutingTargetInstance = async ({
  id,
  instanceId,
}: UpdateProjectRoutingTargetInstanceInput): Promise<{ message: string }> => {
  const response = await axios.patch(
    `${BACKEND_URL}/api/v1/projects/${id}/routing/target-instance`,
    { instanceId },
    { withCredentials: true },
  );

  return response.data;
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
