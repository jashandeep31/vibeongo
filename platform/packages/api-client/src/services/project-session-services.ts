import {
  instances,
  instanceRuntimeKind,
  projects,
  projectSessions,
} from "@repo/db";
import type { AxiosInstance } from "axios";

export type ProjectSession = typeof projectSessions.$inferSelect & {
  project_name: (typeof projects.$inferSelect)["name"];
  instances: (typeof instances.$inferSelect)[];
};

export type GetProjectSessionsParams = {
  projectId?: string;
  page?: number;
  limit?: number;
  archived?: boolean;
};

export type ProjectSessionsResponse = {
  data: ProjectSession[];
  page: number;
  hasNext: boolean;
};

export type ResumeProjectSessionInput = {
  id: (typeof projectSessions.$inferSelect)["id"];
  runtime: (typeof instanceRuntimeKind.enumValues)[number];
};

export type ArchiveProjectSessionInput = {
  id: (typeof projectSessions.$inferSelect)["id"];
  action: boolean;
};

export type CreateProjectSessionInput = {
  projectId: (typeof projects.$inferSelect)["id"];
  sessionName: (typeof projectSessions.$inferSelect)["name"];
  sessionDescription?: string;
};

export type CreateProjectSessionResponse = {
  message: string;
  data: typeof projectSessions.$inferSelect;
};

export const getProjectSessions =
  (apiClient: AxiosInstance) =>
  async ({
    projectId,
    page,
    limit,
    archived = false,
  }: GetProjectSessionsParams = {}): Promise<ProjectSessionsResponse> => {
    const response = await apiClient.get(`/api/v1/project-sessions/`, {
      params: { projectId, page, limit, archived },
      withCredentials: true,
    });

    return response.data;
  };

export const resumeProjectSession =
  (apiClient: AxiosInstance) =>
  async ({ id, runtime }: ResumeProjectSessionInput) => {
    const response = await apiClient.post(
      `/api/v1/project-sessions/${id}`,
      { runtime },
      { withCredentials: true },
    );

    return response.data;
  };

export const archiveProjectSession =
  (apiClient: AxiosInstance) =>
  async ({ id, action }: ArchiveProjectSessionInput) => {
    const response = await apiClient.post(
      `/api/v1/project-sessions/${id}/archive`,
      { action },
      { withCredentials: true },
    );

    return response.data;
  };

export const createProjectSession =
  (apiClient: AxiosInstance) =>
  async (
    input: CreateProjectSessionInput,
  ): Promise<CreateProjectSessionResponse> => {
    const response = await apiClient.post(`/api/v1/project-sessions/`, input, {
      withCredentials: true,
    });

    return response.data;
  };
