import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import {
  and,
  db,
  eq,
  projectDomainRouting,
  projects,
  projectSessions,
  projectSshKeys,
  sshKeys,
} from "@repo/db";
import { z } from "zod";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";
import { spinUpAndSaveInstance } from "../../services/instances/spin-up-and-save-instance.js";
import { createSessionAuthToken } from "../../lib/create-session-auth-token.js";
import { createInstanceSchema } from "@repo/shared";

export const createInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const body = createInstanceSchema.parse(req.body);

    // getting project
    const rows = await db
      .select({
        project: projects,
        sshKey: sshKeys,
      })
      .from(projects)
      .leftJoin(projectSshKeys, eq(projectSshKeys.project_id, projects.id))
      .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
      .where(
        and(eq(projects.user_id, user.id), eq(projects.id, body.projectId)),
      );

    const project = rows[0]?.project;

    const sshKeysArray = rows
      .map((row) => row.sshKey!.value)
      .filter((key) => key !== null);

    if (!project) throw new AppError("Project not found", 404);

    // creating a project session
    const [projectSession] = await db
      .insert(projectSessions)
      .values({
        name: body.sessionName,
        description: body.sessionDescription || "",
        user_id: user.id,
        project_id: project.id,
      })
      .returning();

    if (!projectSession)
      throw new AppError("Failed to create a project session", 500);

    const authToken = await createSessionAuthToken(projectSession.id);
    const setupScript = setupInstanceScript({
      sshKey: sshKeysArray.join("\n"),
      authToken: authToken,
      projectSessionId: projectSession.id,
    });

    const instance = await spinUpAndSaveInstance({
      setupScript,
      project,
      userId: user.id,
      sessionId: projectSession.id,
    });
    if (!instance) throw new AppError("Failed to spin up the instance", 500);
    // setting up the instance id  as default for the project routing
    await db.update(projectDomainRouting).set({
      target_instance_id: instance.id,
    });

    res.status(201).json({
      message: "Successfully had created the project intance",
    });
  },
);
