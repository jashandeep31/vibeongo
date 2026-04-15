import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import {
  and,
  desc,
  db,
  eq,
  instances,
  projectSessions,
  projects,
  projectSshKeys,
  sshKeys,
} from "@repo/db";
import { spinUpAndSaveInstance } from "../../services/instances/spin-up-and-save-instance.js";
import { createSessionAuthToken } from "../../lib/create-session-auth-token.js";
import { z } from "zod";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";

export const getUserProjectSesssion = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const rows = await db
      .select()
      .from(projectSessions)
      .leftJoin(
        instances,
        and(
          eq(instances.project_session_id, projectSessions.id),
          eq(instances.state, "running"),
        ),
      )
      .where(eq(projectSessions.user_id, user.id))
      .orderBy(desc(projectSessions.created_at));

    const sessions = new Map<
      string,
      typeof projectSessions.$inferSelect & {
        instances: (typeof instances.$inferSelect)[];
      }
    >();
    for (const row of rows) {
      const s = row.project_session;
      if (!sessions.has(s.id)) {
        sessions.set(s.id, { ...s, instances: [] });
      }
      if (row.instances) {
        sessions.get(row.project_session.id)?.instances.push(row.instances);
      }
    }

    const refinedData = Array.from(sessions.values());

    res.status(200).json({ data: refinedData });
  },
);

export const resumeProjectSession = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);
    const { id } = z.object({ id: z.string() }).parse(req.params);

    const rows = await db
      .select({
        project: projects,
        project_session: projectSessions,
        ssh_keys: sshKeys.value,
      })
      .from(projectSessions)
      .innerJoin(projects, eq(projects.id, projectSessions.project_id))
      .leftJoin(projectSshKeys, eq(projectSshKeys.project_id, projects.id))
      .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
      .where(
        and(eq(projectSessions.id, id), eq(projectSessions.user_id, user.id)),
      );
    const projectSession = rows[0]?.project_session;
    const project = rows[0]?.project;
    const sshKeysArray = [...rows.map((r) => r.ssh_keys)].filter(
      (key) => key !== null,
    );
    if (!project) throw new AppError("Project not found", 404);
    if (!projectSession) throw new AppError("Project session not found", 404);

    const authToken = await createSessionAuthToken(projectSession.id);
    const setupScript = setupInstanceScript({
      sshKey: sshKeysArray.join("\n"),
      authToken: authToken,
      projectSessionId: projectSession.id,
    });
    await spinUpAndSaveInstance({
      setupScript,
      project,
      userId: user.id,
      sessionId: projectSession.id,
    });

    res.status(200).json({ message: "Successfully resumed the instance" });
  },
);
