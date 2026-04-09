import { App, IssuesOpenedEvent } from "@octokit/webhooks-types";
import { WebhookHandler } from "../types.js";
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
import { getRefinedTaskFromUserIssuesComment } from "../../../ai/ai-functions/get-refined-task-from-user-issues-comment.js";
import { createSessionAuthToken } from "../../../lib/create-session-auth-token.js";
import { setupInstanceScript } from "../../../scripts/setup-instance-script.js";
import { spinUpAndSaveInstance } from "../../../services/instances/spin-up-and-save-instance.js";

export const issueOpenedHandler = async (
  event: WebhookHandler<IssuesOpenedEvent>,
) => {
  const { payload, octokit } = event;
  const issueOpnerUsername = payload.issue?.user?.login;
  const full_name = payload.repository?.full_name;
  if (!issueOpnerUsername || !full_name) {
    return;
  }
  const [row] = await db
    .select({
      repo: githubRepos,
      user: users,
      project: projects,
    })
    .from(githubRepos)
    .innerJoin(users, eq(githubRepos.user_id, users.id))
    .leftJoin(projects, eq(githubRepos.default_project_id, projects.id))
    .where(eq(githubRepos.full_name, full_name));

  if (!row || !row.repo || !row.user || !row.project || !payload.issue.body) {
    if (!row?.project)
      console.log(`
                                 
Please add hte default project to the github repo
                                 
`);
    console.log(row?.repo, row?.user, row?.project, payload.issue.body);
    return;
  }
  const { project, user, repo } = row;
  // Refining the task given by the user
  //   const tasks = await getRefinedTaskFromUserIssuesComment(`
  // Issue Url: ${payload.issue.url}
  // Issue title: ${payload.issue.title}
  // Issue body: ${payload.issue.body}
  // `);

  const session = await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(projectSessions)
      .values({
        user_id: row.user.id,
        project_id: project.id,
      })
      .returning();
    if (!session) return;

    await tx.insert(projectSessionTasks).values({
      folder_name: "",
      task: `
      Hi the issue is opended up with the following details:
      Title: ${payload.issue.title}
      URL: ${payload.issue.url}
      Body: ${payload.issue.body}
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
  const intialScript = setupInstanceScript({
    sshKey: sshKeysArray
      .map((s) => s.shh_keys?.value || "")
      .filter((s) => s)
      .join("\n"),
    authToken: authToken,
    projectSessionId: session.id,
  });

  const [regionRow] = await db
    .select()
    .from(instanceTypes)
    .innerJoin(instanceRegions, eq(instanceRegions.id, instanceTypes.region_id))
    .where(eq(instanceTypes.id, project.instance_type_id));
  if (!regionRow || !regionRow.instance_regions) return;

  await spinUpAndSaveInstance({
    setupScript: intialScript,
    project,
    userId: user.id,
  });
  return;
};
