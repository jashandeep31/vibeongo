import { BACKEND_URL } from "@/lib/constants";
import { instances, projectSessions } from "@repo/db";
import axios from "axios";

export type ProjectSessionWithRunningInstances =
  typeof projectSessions.$inferSelect & {
    instances: (typeof instances.$inferSelect)[];
  };
export const getProjectSessions = async (): Promise<
  ProjectSessionWithRunningInstances[]
> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/project-sessions/`, {
    withCredentials: true,
  });
  console.log(res.data.data);

  return res.data.data;
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
