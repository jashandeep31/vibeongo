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

type AddAllowedIpInput = {
  id: string;
  ip: string;
};

type DeleteMultipleAllowedIpsInput = {
  id: string;
  ids: string[];
};

type UpdateProjectDomainAccessInput = {
  id: string;
  domainId: string;
  allow_all_ips: boolean;
};

type UpdateProjectDomainPortInput = {
  id: string;
  domainId: string;
  target_port: number;
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

export const addAllowedIpToProject = async ({
  id,
  ip,
}: AddAllowedIpInput): Promise<{ message: string }> => {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/projects/${id}/allowed-ips`,
    { ip },
    { withCredentials: true },
  );

  return response.data;
};

export const deleteMultipleAllowedIpsFromProject = async ({
  id,
  ids,
}: DeleteMultipleAllowedIpsInput): Promise<{ message: string }> => {
  const response = await axios.delete(
    `${BACKEND_URL}/api/v1/projects/${id}/allowed-ips`,
    { data: { ids }, withCredentials: true },
  );

  return response.data;
};

export const updateProjectDomainAccess = async ({
  id,
  domainId,
  allow_all_ips,
}: UpdateProjectDomainAccessInput): Promise<{ message: string }> => {
  const response = await axios.patch(
    `${BACKEND_URL}/api/v1/projects/${id}/domains/${domainId}`,
    { allow_all_ips },
    { withCredentials: true },
  );

  return response.data;
};

export const updateProjectDomainPort = async ({
  id,
  domainId,
  target_port,
}: UpdateProjectDomainPortInput): Promise<{ message: string }> => {
  const response = await axios.patch(
    `${BACKEND_URL}/api/v1/projects/${id}/domains/${domainId}`,
    { target_port },
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
