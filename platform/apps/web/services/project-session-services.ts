import { BACKEND_URL } from "@/lib/constants";
import { instances, projectSessions } from "@repo/db";
import axios from "axios";

export type ProjectSessionWithRunningInstances =
  typeof projectSessions.$inferSelect & {
    instances: (typeof instances.$inferSelect)[];
  };

export type GetProjectSessionsParams = {
  projectId?: string;
  page?: number;
  limit?: number;
};

export type ProjectSessionsResponse = {
  data: ProjectSessionWithRunningInstances[];
  page: number;
  hasNext: boolean;
};

export const getProjectSessions = async ({
  projectId,
  page,
  limit,
}: GetProjectSessionsParams = {}): Promise<ProjectSessionsResponse> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/project-sessions/`, {
    params: {
      projectId,
      page,
      limit,
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
