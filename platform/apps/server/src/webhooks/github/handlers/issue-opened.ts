import { App, IssuesOpenedEvent } from "@octokit/webhooks-types";
import { WebhookHandler } from "../types.js";
import {
  db,
  eq,
  githubRepos,
  projects,
  projectSessions,
  projectSesssionTasks,
  users,
} from "@repo/db";
import { getRefinedTaskFromUserIssuesComment } from "../../../ai/ai-functions/get-refined-task-from-user-issues-comment.js";

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
    console.log(row?.repo, row?.user, row?.project, payload.issue.body);
    return;
  }
  const { project, user, repo } = row;
  // Refining the task given by the user
  const task = await getRefinedTaskFromUserIssuesComment(payload.issue.body);
  console.log({
    folder: row.repo.full_name.split("/")[1],
    task,
  });
  await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(projectSessions)
      .values({
        user_id: row.user.id,
        project_id: project.id,
      })
      .returning();
    if (!session) return;

    await tx.insert(projectSesssionTasks).values({
      folder_name: row.repo.full_name.split("/")[1]!,
      task: task,
      done: false,
      project_session_id: session.id,
    });
    return session;
  });
};
