import { BACKEND_URL } from "@/lib/constants";
import {
  instanceRegions,
  projectFileData,
  projectFiles,
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

export const updateProject = async ({
  id,
  projectData,
}: {
  id: string;
  projectData: unknown;
}) => {
  const res = await axios.patch(
    BACKEND_URL + `/api/v1/projects/${id}`,
    projectData,
    {
      withCredentials: true,
    },
  );
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

export type ProjectConfigForEdit = {
  project: typeof projects.$inferSelect;
  instanceRegionId: (typeof instanceRegions.$inferSelect)["id"] | null;
  instanceTypeId: (typeof projects.$inferSelect)["instance_type_id"];
  sshKeyIds: string[];
  githubRepoIds: string[];
  config: (typeof projects.$inferSelect)["config"];
};

export const getProjectConfigForEdit = async (
  id: string,
): Promise<ProjectConfigForEdit> => {
  const res = await axios.get(
    BACKEND_URL + `/api/v1/projects/${id}/get-project-config`,
    {
      withCredentials: true,
    },
  );
  return res.data.data;
};

type GetProjectFilesResponse = {
  projectFiles: typeof projectFiles.$inferSelect;
  projectFileData?: typeof projectFileData.$inferSelect | null;
};

export const getProjectFilesById = async (
  id: string,
): Promise<GetProjectFilesResponse[]> => {
  const res = await axios.get(
    BACKEND_URL + `/api/v1/projects/${id}/project-files`,
    {
      withCredentials: true,
    },
  );

  return res.data.data;
};

export const createProjectFile = async ({
  id,
  name,
  path,
  content,
}: {
  id: string;
  name: string;
  path: string;
  content: string;
}): Promise<{ message: string }> => {
  const res = await axios.post(
    BACKEND_URL + `/api/v1/projects/${id}/project-files`,
    { name, path, content },
    {
      withCredentials: true,
    },
  );

  return res.data;
};

export const updateProjectFile = async ({
  id,
  fileId,
  name,
  path,
  content,
}: {
  id: string;
  fileId: string;
  name?: string;
  path?: string;
  content?: string;
}): Promise<{ message: string }> => {
  const res = await axios.patch(
    BACKEND_URL + `/api/v1/projects/${id}/project-files/${fileId}`,
    { name, path, content },
    {
      withCredentials: true,
    },
  );

  return res.data;
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

type DeleteMultipleAllowedIpsInput = {
  id: string;
  ids: string[];
};

type UpdateProjectDomainPortInput = {
  id: string;
  domainId: string;
  target_port: number;
};

type UpdateProjectRoutingTargetInstanceInput = {
  id: string;
  instanceId: string;
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

export const deleteMultipleAllowedIpsFromProject = async ({
  id,
  ids,
}: DeleteMultipleAllowedIpsInput): Promise<{ message: string }> => {
  const res = await axios.delete(
    BACKEND_URL + `/api/v1/projects/${id}/allowed-ips`,
    {
      data: { ids },
      withCredentials: true,
    },
  );

  return res.data;
};

export const updateProjectDomainPort = async ({
  id,
  domainId,
  target_port,
}: UpdateProjectDomainPortInput): Promise<{ message: string }> => {
  const res = await axios.patch(
    BACKEND_URL + `/api/v1/projects/${id}/domains/${domainId}`,
    { target_port },
    {
      withCredentials: true,
    },
  );

  return res.data;
};

export const updateProjectRoutingTargetInstance = async ({
  id,
  instanceId,
}: UpdateProjectRoutingTargetInstanceInput): Promise<{ message: string }> => {
  const res = await axios.patch(
    BACKEND_URL + `/api/v1/projects/${id}/routing/target-instance`,
    { instanceId },
    {
      withCredentials: true,
    },
  );

  return res.data;
};
