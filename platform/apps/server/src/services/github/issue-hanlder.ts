import {
  db,
  eq,
  githubRepos,
  instanceRegions,
  instanceTypes,
  projects,
  projectSessions,
  projectSessionTasks,
  projectSshKeys,
  sshKeys,
  users,
} from "@repo/db";
import { getSessionNameAndDescription } from "../../ai/ai-functions/get-session-name-and-description.js";
import { createSessionAuthToken } from "../../lib/create-session-auth-token.js";
import { spinUpAndSaveInstance } from "../instances/spin-up-and-save-instance.js";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";

/**
 * Receives the issue_id, then proccess as per that issue
 */
export const issueHandler = async (full_name: string) => {
  const [githubReposWithUserAndProject] = await db
    .select({
      repo: githubRepos,
      user: users,
      project: projects,
    })
    .from(githubRepos)
    .innerJoin(users, eq(githubRepos.user_id, users.id))
    .leftJoin(projects, eq(githubRepos.default_project_id, projects.id))
    .where(eq(githubRepos.full_name, full_name));
  if (!githubReposWithUserAndProject) throw new Error("repo not found");

  const { project, user, repo } = githubReposWithUserAndProject;
  if (!project || !user || !repo) throw new Error("repo not found");

  const sessionMeta = await getSessionNameAndDescription(
    "this is needed to update",
  );

  const session = await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(projectSessions)
      .values({
        name: sessionMeta.name || "New Session",
        description: sessionMeta.description || "",
        user_id: githubReposWithUserAndProject.user.id,
        project_id: project.id,
      })
      .returning();
    if (!session) return;

    await tx.insert(projectSessionTasks).values({
      folder_name: repo.full_name.split("/")[1],
      task: `
      Hi the issue is opended up with the following details:
      `,
      done: false,
      project_session_id: session.id,
    });

    return session;
  });
  if (!session) return;
  const authToken = await createSessionAuthToken(session.id);

  const sshKeysArray = await db
    .select()
    .from(projectSshKeys)
    .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id));

  // --- intialScript that we run after the vps setup ---
  const instanceId = crypto.randomUUID();
  const intialScript = setupInstanceScript({
    sshKey: sshKeysArray
      .map((s) => s.shh_keys?.value || "")
      .filter((s) => s)
      .join("\n"),
    authToken: authToken,
    projectSessionId: session.id,
    instanceId,
    terminate: true,
  });

  const [regionRow] = await db
    .select()
    .from(instanceTypes)
    .innerJoin(instanceRegions, eq(instanceRegions.id, instanceTypes.region_id))
    .where(eq(instanceTypes.id, project.instance_type_id));
  if (!regionRow || !regionRow.instance_regions) return;

  const instance = await spinUpAndSaveInstance({
    setupScript: intialScript,
    project,
    userId: user.id,
    sessionId: session.id,
    instanceId,
  });
};

// Title: ${payload.issue.title}
// URL: ${payload.issue.url}
// Body: ${payload.issue.body}
