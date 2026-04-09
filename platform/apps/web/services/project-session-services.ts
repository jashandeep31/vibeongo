import { BACKEND_URL } from "@/lib/constants";
import { instances, projectSessions } from "@repo/db";
import axios from "axios";

type DbProjectSession = typeof projectSessions.$inferSelect;
type DbInstance = typeof instances.$inferSelect;

type ProjectSessionsApiRow = {
  project_session?: DbProjectSession | null;
  projectSessions?: DbProjectSession | null;
  instances?: DbInstance | null;
  instance?: DbInstance | null;
};

export type ProjectSessionWithRunningInstance = {
  session: DbProjectSession;
  runningInstance: DbInstance | null;
};

export const getProjectSessions = async (): Promise<
  ProjectSessionWithRunningInstance[]
> => {
  const res = await axios.get<{ data: ProjectSessionsApiRow[] }>(
    `${BACKEND_URL}/api/v1/project-sessions/`,
    {
      withCredentials: true,
    },
  );

  const rows = Array.isArray(res.data.data) ? res.data.data : [];

  return rows.reduce<ProjectSessionWithRunningInstance[]>((acc, row) => {
    const session = row.projectSessions ?? row.project_session;

    if (!session) {
      return acc;
    }

    acc.push({
      session,
      runningInstance: row.instances ?? row.instance ?? null,
    });

    return acc;
  }, []);
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
