import { IssueCommentCreatedEvent } from "@octokit/webhooks-types";
import { WebhookHandler } from "../types.js";
import {
  and,
  db,
  eq,
  gitRepos,
  projects,
  users,
  userSettings,
} from "@repo/db";
import { createInstanceSchema } from "@repo/shared";
import { getSessionNameAndDescriptionAgent } from "../../../ai/ai-agents/common-agents.js";
import { createTasksForPRIssueOrCommentAgent } from "../../../ai/ai-agents/create-tasks-for-pr-issue-or-comment-agent.js";
import { createProjectSessionInstance } from "../../../services/instances/create-project-session-instance.js";

export const commentHandler = async (
  event: WebhookHandler<IssueCommentCreatedEvent>,
) => {
  const { payload, octokit } = event;

  // Getting , body , commenterUsername , repoFullName
  const body = payload.comment.body;
  const commenterUsername = payload.comment.user.login;
  const repoFullName = payload.repository.full_name;

  //checking for tag
  if (!body.includes("@vibeongo")) return;

  // validating all 3
  if (!repoFullName || !body || !commenterUsername) return;

  // selecing the rpeo, project and user
  const [githubRepoWithUserAndProject] = await db
    .select({
      project: projects,
      user: users,
      repo: gitRepos,
    })
    .from(gitRepos)
    .innerJoin(users, and(eq(users.username, commenterUsername)))
    .innerJoin(projects, eq(projects.id, gitRepos.default_project_id))
    .where(eq(gitRepos.full_name, repoFullName));

  if (!githubRepoWithUserAndProject) return;
  const { project, user, repo } = githubRepoWithUserAndProject;

  // checking if the commenter is the repo owner
  if (user.username !== commenterUsername) {
    //TODO: leave the comment on the github
    return;
  }

  const [sessionMetadata, tasks, userSettingsRows] = await Promise.all([
    getSessionNameAndDescriptionAgent(body),
    createTasksForPRIssueOrCommentAgent(
      "comment",
      `${payload.comment.url} body: ${body}`,
    ),
    db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, user.id)),
  ]);
  const userSettingsRow = userSettingsRows[0];

  const input = createInstanceSchema.parse({
    projectId: project.id,
    sessionName: sessionMetadata.name || "New Session",
    sessionDescription: sessionMetadata.description || "",
    tasks: tasks.map((task) => ({
      task: task.task,
      agent: task.agent,
      repoId: repo.id,
      model:
        task.agent === "pr-reviewer"
          ? (userSettingsRow?.default_pr_model ?? "")
          : task.agent === "issue-resolver"
            ? (userSettingsRow?.default_issue_fixer_model ?? "")
            : "",
    })),
  });

  await createProjectSessionInstance({
    userId: user.id,
    input,
    sessionCategory: "auto",
    terminate: true,
    terminateSetting: payload.issue.pull_request ? "pr" : "issue",
    runtime: "sandbox",
  });
};
