import { BACKEND_URL } from "@/lib/constants";
import {
  githubRepos,
  instances,
  instanceRegions,
  projectDomainRouting,
  projectFileData,
  projectFiles,
  projects,
  projectSessions,
  proxyDomains,
  routingAllowedIps,
} from "@repo/db";
import { projectConfigValidator, type z } from "@repo/shared";
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

export type ProjectFile = typeof projectFiles.$inferSelect & {
  projectFileData?: Pick<
    typeof projectFileData.$inferSelect,
    "id" | "version" | "created_at" | "updated_at"
  > & { content: string };
};

export type CreateProjectResponse = {
  message: string;
  data: Project;
};

export type ProjectConfigForEdit = {
  project: Project;
  provider: (typeof instanceRegions.$inferSelect)["provider"];
  instanceRegionId: (typeof instanceRegions.$inferSelect)["id"] | null;
  instanceTypeId: Project["instance_type_id"];
  sandboxTypeId: Project["sandbox_type_id"];
  sandboxRegionId: string | null;
  sshKeyIds: string[];
  githubRepoIds: string[];
  config: z.infer<typeof projectConfigValidator>["config"];
};

export type UpdateProjectInput = {
  id: Project["id"];
  projectData: unknown;
};

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

export const createProject = async (
  projectData: unknown,
): Promise<CreateProjectResponse> => {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/projects`,
    projectData,
    { withCredentials: true },
  );

  return response.data;
};

export const updateProject = async ({
  id,
  projectData,
}: UpdateProjectInput): Promise<CreateProjectResponse> => {
  const response = await axios.patch(
    `${BACKEND_URL}/api/v1/projects/${id}`,
    projectData,
    { withCredentials: true },
  );

  return response.data;
};

export const deleteProject = async (
  id: Project["id"],
): Promise<{ message: string }> => {
  const response = await axios.delete(`${BACKEND_URL}/api/v1/projects/${id}`, {
    withCredentials: true,
  });

  return response.data;
};

export const createGithubRepo = async (input: {
  url: string;
  setup_script: string;
}): Promise<{ message: string }> => {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/github-repos/`,
    input,
    { withCredentials: true },
  );

  return response.data;
};

export const getGithubRepos = async (): Promise<ProjectGithubRepo[]> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/github-repos/`, {
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

export const getProjectConfigForEdit = async (
  id: string,
): Promise<ProjectConfigForEdit> => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/projects/${id}/get-project-config`,
    { withCredentials: true },
  );

  return response.data.data;
};

export const getProjectFilesById = async (
  id: string,
): Promise<ProjectFile[]> => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/projects/${id}/project-files`,
    { withCredentials: true },
  );

  return response.data.data;
};

export type CreateProjectFileInput = {
  id: string;
  name: string;
  path: string;
  content: string;
};

export const createProjectFile = async ({
  id,
  name,
  path,
  content,
}: CreateProjectFileInput): Promise<{ message: string }> => {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/projects/${id}/project-files`,
    { name, path, content },
    { withCredentials: true },
  );

  return response.data;
};

export type UpdateProjectFileInput = CreateProjectFileInput & {
  fileId: string;
};

export const updateProjectFile = async ({
  id,
  fileId,
  name,
  path,
  content,
}: UpdateProjectFileInput): Promise<{ message: string }> => {
  const response = await axios.patch(
    `${BACKEND_URL}/api/v1/projects/${id}/project-files/${fileId}`,
    { name, path, content },
    { withCredentials: true },
  );

  return response.data;
};

export const deleteProjectFile = async ({
  id,
  fileId,
}: Pick<UpdateProjectFileInput, "id" | "fileId">): Promise<{
  message: string;
}> => {
  const response = await axios.delete(
    `${BACKEND_URL}/api/v1/projects/${id}/project-files/${fileId}`,
    { withCredentials: true },
  );

  return response.data;
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
