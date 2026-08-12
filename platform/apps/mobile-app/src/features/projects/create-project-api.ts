import { apiRequest } from "@/lib/api";

import type { Project } from "@/features/home/types";

export type InstanceProvider = "aws" | "digitalocean";
export type SandboxProvider = "daytona" | "e2b" | "vercel";

export type RuntimeRegion = {
  id: string;
  name: string;
  provider: InstanceProvider;
  slug: string;
};

export type SandboxRegion = {
  id: string;
  name: string;
  provider: SandboxProvider;
  slug: string;
};

export type RuntimeType = {
  cpu: string | null;
  id: string;
  name: string;
  ram: string | null;
  slug: string;
};

export type GithubRepoOption = { full_name: string; id: string };
export type SshKeyOption = { id: string; name: string };

export type ProjectConfigForEdit = {
  config: {
    packages: Array<{ config: Record<string, unknown>; name: string }>;
    ports: Array<{ port: number; protocol: "TCP" | "UDP" }>;
  };
  githubRepoIds: string[];
  instanceRegionId: string | null;
  instanceTypeId: string;
  project: {
    description: string | null;
    dev_script: string;
    final_script: string;
    initial_script: string;
    name: string;
  };
  provider: InstanceProvider;
  sandboxRegionId: string | null;
  sandboxTypeId: string | null;
  sshKeyIds: string[];
};

export const getInstanceRegions = (signal?: AbortSignal) =>
  apiRequest<RuntimeRegion[]>("/api/v1/metadata/instances/regions", {}, signal);

export const getInstanceTypes = (regionId: string, signal?: AbortSignal) =>
  apiRequest<RuntimeType[]>(
    `/api/v1/metadata/instances/regions/${encodeURIComponent(regionId)}/types`,
    {},
    signal,
  );

export const getSandboxRegions = (signal?: AbortSignal) =>
  apiRequest<SandboxRegion[]>("/api/v1/metadata/sandboxes/regions", {}, signal);

export const getSandboxTypes = (regionId: string, signal?: AbortSignal) =>
  apiRequest<RuntimeType[]>(
    `/api/v1/metadata/sandboxes/regions/${encodeURIComponent(regionId)}/types`,
    {},
    signal,
  );

export const getGithubRepoOptions = (signal?: AbortSignal) =>
  apiRequest<GithubRepoOption[]>("/api/v1/github-repos/", {}, signal);

export const getSshKeyOptions = (signal?: AbortSignal) =>
  apiRequest<SshKeyOption[]>("/api/v1/users/ssh-keys", {}, signal);

export const createProject = (payload: unknown) =>
  apiRequest<Project>("/api/v1/projects", {
    body: JSON.stringify(payload),
    method: "POST",
  });

export const getProjectConfig = (projectId: string, signal?: AbortSignal) =>
  apiRequest<ProjectConfigForEdit>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/get-project-config`,
    {},
    signal,
  );

export const updateProject = (projectId: string, payload: unknown) =>
  apiRequest<Project>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    body: JSON.stringify(payload),
    method: "PATCH",
  });
