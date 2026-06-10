import { BACKEND_URL } from "@/lib/constants";
import {
  instances,
  projectSessionTaskAgents,
  projectSessionTasks,
  projectSessions,
} from "@repo/db";
import axios from "axios";

export type ProjectSessionWithRunningInstances =
  typeof projectSessions.$inferSelect & {
    instances: (typeof instances.$inferSelect)[];
  };

export type ProjectSessionDetails = typeof projectSessions.$inferSelect & {
  instances: (typeof instances.$inferSelect)[];
  tasks: (typeof projectSessionTasks.$inferSelect)[];
};

export type GetProjectSessionsParams = {
  projectId?: string;
  page?: number;
  limit?: number;
  archived?: boolean;
};

export type ProjectSessionsResponse = {
  data: ProjectSessionWithRunningInstances[];
  page: number;
  hasNext: boolean;
};

export type ArchiveProjectSessionInput = {
  id: string;
  action: boolean;
};

export type AddTaskToProjectSessionInput = {
  id: string;
  task: string;
  model?: string;
  agent: (typeof projectSessionTaskAgents.enumValues)[number];
  repoId: string;
};

export type UpdateProjectSessionTaskInput = {
  id: string;
  taskId: string;
  task?: string;
  model?: string;
  agent?: (typeof projectSessionTaskAgents.enumValues)[number];
  repoId?: string;
  done?: boolean;
};

export type DeleteProjectSessionTaskInput = {
  id: string;
  taskId: string;
};

export const getProjectSessions = async ({
  projectId,
  page,
  limit,
  archived = false,
}: GetProjectSessionsParams = {}): Promise<ProjectSessionsResponse> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/project-sessions/`, {
    params: {
      projectId,
      page,
      limit,
      archived: archived,
    },
    withCredentials: true,
  });

  return res.data;
};

export const resumeProjectSession = async (id: string) => {
  const res = await axios.post(
    `${BACKEND_URL}/api/v1/project-sessions/${id}`,
    {},
    {
      withCredentials: true,
    },
  );
  return res.data;
};

export const archiveProjectSession = async ({
  id,
  action,
}: ArchiveProjectSessionInput) => {
  const res = await axios.post(
    `${BACKEND_URL}/api/v1/project-sessions/${id}/archive`,
    { action },
    {
      withCredentials: true,
    },
  );
  return res.data;
};

export const addTaskToProjectSession = async ({
  id,
  task,
  model,
  agent,
  repoId,
}: AddTaskToProjectSessionInput) => {
  const res = await axios.post(
    `${BACKEND_URL}/api/v1/project-sessions/${id}/tasks`,
    { task, model, agent, repoId },
    {
      withCredentials: true,
    },
  );

  return res.data;
};

export const updateProjectSessionTask = async ({
  id,
  taskId,
  task,
  model,
  agent,
  repoId,
  done,
}: UpdateProjectSessionTaskInput) => {
  const res = await axios.patch(
    `${BACKEND_URL}/api/v1/project-sessions/${id}/tasks/${taskId}`,
    { task, model, agent, repoId, done },
    {
      withCredentials: true,
    },
  );

  return res.data;
};

export const deleteProjectSessionTask = async ({
  id,
  taskId,
}: DeleteProjectSessionTaskInput) => {
  const res = await axios.delete(
    `${BACKEND_URL}/api/v1/project-sessions/${id}/tasks/${taskId}`,
    {
      withCredentials: true,
    },
  );

  return res.data;
};

export const getProjectSessionById = async (
  id: string,
): Promise<ProjectSessionDetails> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/project-sessions/${id}`, {
    withCredentials: true,
  });
  return res.data.data;
};
