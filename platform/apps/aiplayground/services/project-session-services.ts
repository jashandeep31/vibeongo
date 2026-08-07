import { BACKEND_URL } from "@/lib/constants";
import {
  instances,
  instanceRuntimeKind,
  projects,
  projectSessions,
} from "@repo/db";
import axios from "axios";

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

export type CreateProjectSessionInput = {
  projectId: (typeof projects.$inferSelect)["id"];
  sessionName: (typeof projectSessions.$inferSelect)["name"];
  sessionDescription?: string;
};

export type CreateProjectSessionResponse = {
  message: string;
  data: typeof projectSessions.$inferSelect;
};

export const getProjectSessions = async ({
  projectId,
  page,
  limit,
  archived = false,
}: GetProjectSessionsParams = {}): Promise<ProjectSessionsResponse> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/project-sessions/`, {
    params: { projectId, page, limit, archived },
    withCredentials: true,
  });

  return response.data;
};

export const resumeProjectSession = async ({
  id,
  runtime,
}: ResumeProjectSessionInput) => {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/project-sessions/${id}`,
    { runtime },
    { withCredentials: true },
  );

  return response.data;
};

export const createProjectSession = async (
  input: CreateProjectSessionInput,
): Promise<CreateProjectSessionResponse> => {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/project-sessions/`,
    input,
    { withCredentials: true },
  );

  return response.data;
};
