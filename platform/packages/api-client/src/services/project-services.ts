import {
  gitRepos,
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
import type { AxiosInstance } from "axios";

export type Project = typeof projects.$inferSelect;
export type ProjectWithSessions = Project & {
  sessions: (typeof projectSessions.$inferSelect)[];
};

export type DemoProject = {
  reponame: string;
  ownername: string;
  description: string;
  tags: string[];
  project: {
    name: string;
    description: string;
    devScript: string;
  };
};

export type ImportDemoProjectInput = Pick<
  DemoProject,
  "ownername" | "reponame"
>;

export type ProjectDomains = typeof projectDomainRouting.$inferSelect & {
  proxy_domains: (typeof proxyDomains.$inferSelect)[];
  allowed_ips: (typeof routingAllowedIps.$inferSelect)[];
};

export type ProjectGithubRepo = Pick<
  typeof gitRepos.$inferSelect,
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

export const getProjects =
  (apiClient: AxiosInstance) => async (): Promise<Project[]> => {
    const response = await apiClient.get(`/api/v1/projects`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const getDemoProjects =
  (apiClient: AxiosInstance) => async (): Promise<DemoProject[]> => {
    const response = await apiClient.get(`/api/v1/projects/demo-projects`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const importDemoProjects =
  (apiClient: AxiosInstance) =>
  async (demo?: ImportDemoProjectInput): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `/api/v1/projects/demo-projects/import`,
      demo,
      { withCredentials: true },
    );

    return response.data;
  };

export const createProject =
  (apiClient: AxiosInstance) =>
  async (projectData: unknown): Promise<CreateProjectResponse> => {
    const response = await apiClient.post(`/api/v1/projects`, projectData, {
      withCredentials: true,
    });

    return response.data;
  };

export const updateProject =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    projectData,
  }: UpdateProjectInput): Promise<CreateProjectResponse> => {
    const response = await apiClient.patch(
      `/api/v1/projects/${id}`,
      projectData,
      { withCredentials: true },
    );

    return response.data;
  };

export const deleteProject =
  (apiClient: AxiosInstance) =>
  async (id: Project["id"]): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/v1/projects/${id}`, {
      withCredentials: true,
    });

    return response.data;
  };

export const createGithubRepo =
  (apiClient: AxiosInstance) =>
  async (input: {
    url: string;
    setup_script: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/v1/git-repos/`, input, {
      withCredentials: true,
    });

    return response.data;
  };

export const getGithubRepos =
  (apiClient: AxiosInstance) => async (): Promise<ProjectGithubRepo[]> => {
    const response = await apiClient.get(`/api/v1/git-repos/`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const getProjectsWithSessions =
  (apiClient: AxiosInstance) => async (): Promise<ProjectWithSessions[]> => {
    const response = await apiClient.get(`/api/v1/projects/with-sessions`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const getProjectConfigForEdit =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<ProjectConfigForEdit> => {
    const response = await apiClient.get(
      `/api/v1/projects/${id}/get-project-config`,
      { withCredentials: true },
    );

    return response.data.data;
  };

export const getProjectFilesById =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<ProjectFile[]> => {
    const response = await apiClient.get(
      `/api/v1/projects/${id}/project-files`,
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

export const createProjectFile =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    name,
    path,
    content,
  }: CreateProjectFileInput): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `/api/v1/projects/${id}/project-files`,
      { name, path, content },
      { withCredentials: true },
    );

    return response.data;
  };

export type UpdateProjectFileInput = CreateProjectFileInput & {
  fileId: string;
};

export const updateProjectFile =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    fileId,
    name,
    path,
    content,
  }: UpdateProjectFileInput): Promise<{ message: string }> => {
    const response = await apiClient.patch(
      `/api/v1/projects/${id}/project-files/${fileId}`,
      { name, path, content },
      { withCredentials: true },
    );

    return response.data;
  };

export const deleteProjectFile =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    fileId,
  }: Pick<UpdateProjectFileInput, "id" | "fileId">): Promise<{
    message: string;
  }> => {
    const response = await apiClient.delete(
      `/api/v1/projects/${id}/project-files/${fileId}`,
      { withCredentials: true },
    );

    return response.data;
  };

export const getProjectDomainsById =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<ProjectDomains> => {
    const response = await apiClient.get(`/api/v1/projects/${id}/domains`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const updateProjectRoutingTargetInstance =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    instanceId,
  }: UpdateProjectRoutingTargetInstanceInput): Promise<{ message: string }> => {
    const response = await apiClient.patch(
      `/api/v1/projects/${id}/routing/target-instance`,
      { instanceId },
      { withCredentials: true },
    );

    return response.data;
  };

export const addAllowedIpToProject =
  (apiClient: AxiosInstance) =>
  async ({ id, ip }: AddAllowedIpInput): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `/api/v1/projects/${id}/allowed-ips`,
      { ip },
      { withCredentials: true },
    );

    return response.data;
  };

export const deleteMultipleAllowedIpsFromProject =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    ids,
  }: DeleteMultipleAllowedIpsInput): Promise<{ message: string }> => {
    const response = await apiClient.delete(
      `/api/v1/projects/${id}/allowed-ips`,
      { data: { ids }, withCredentials: true },
    );

    return response.data;
  };

export const updateProjectDomainAccess =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    domainId,
    allow_all_ips,
  }: UpdateProjectDomainAccessInput): Promise<{ message: string }> => {
    const response = await apiClient.patch(
      `/api/v1/projects/${id}/domains/${domainId}`,
      { allow_all_ips },
      { withCredentials: true },
    );

    return response.data;
  };

export const updateProjectDomainPort =
  (apiClient: AxiosInstance) =>
  async ({
    id,
    domainId,
    target_port,
  }: UpdateProjectDomainPortInput): Promise<{ message: string }> => {
    const response = await apiClient.patch(
      `/api/v1/projects/${id}/domains/${domainId}`,
      { target_port },
      { withCredentials: true },
    );

    return response.data;
  };

export const getProjectGithubReposById =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<ProjectGithubRepo[]> => {
    const response = await apiClient.get(
      `/api/v1/projects/${id}/github-repos`,
      { withCredentials: true },
    );

    return response.data.data;
  };
