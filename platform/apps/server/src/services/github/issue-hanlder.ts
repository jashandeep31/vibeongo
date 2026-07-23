import {
  and,
  db,
  eq,
  githubRepos,
  projects,
  projectSessionsCategory,
  users,
  userSettings,
} from "@repo/db";
import { createInstanceSchema } from "@repo/shared";
import { createTasksForPRIssueOrCommentAgent } from "../../ai/ai-agents/create-tasks-for-pr-issue-or-comment-agent.js";
import { getSessionNameAndDescriptionAgent } from "../../ai/ai-agents/common-agents.js";
import { getIssueDetailByIssueNumber } from "../../github-app-functions/get-issue-or-pull-request-detail-by-number.js";
import { createProjectSessionInstance } from "../instances/create-project-session-instance.js";
import type { spinUpAndSaveInstanceResponse } from "../instances/spin-up-and-save-instance.js";

interface issueHandlerProps {
  gitRepoId: string;
  issueNumber: number;
  requestedByUserId?: string;
  sessionCat?: (typeof projectSessionsCategory.enumValues)[number];
}

export const issueRequestHandler = async ({
  gitRepoId,
  issueNumber,
  requestedByUserId,
  sessionCat = "manual",
}: issueHandlerProps): Promise<spinUpAndSaveInstanceResponse> => {
  const [githubRepoWithUserAndProject] = await db
    .select({
      repo: githubRepos,
      user: users,
      project: projects,
    })
    .from(githubRepos)
    .innerJoin(users, eq(githubRepos.user_id, users.id))
    .leftJoin(projects, eq(githubRepos.default_project_id, projects.id))
    .where(
      and(
        eq(githubRepos.id, gitRepoId),
        requestedByUserId
          ? eq(githubRepos.user_id, requestedByUserId)
          : undefined,
      ),
    );

  if (!githubRepoWithUserAndProject) throw new Error("repo not found");
  const { project, user, repo } = githubRepoWithUserAndProject;
  if (!project || !user || !repo) throw new Error("repo not found");

  const issue = await getIssueDetailByIssueNumber({
    installation_id: repo.installation_id,
    issue_number: issueNumber,
    full_repo_name: repo.full_name,
  });
  const sessionMeta = await getSessionNameAndDescriptionAgent(
    issue.title + "\n" + issue.body,
  );
  const generatedTasks = await createTasksForPRIssueOrCommentAgent(
    "issue",
    `${issue.url} body: ${issue.body}`,
  );
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.user_id, user.id));

  const input = createInstanceSchema.parse({
    projectId: project.id,
    sessionName: sessionMeta.name || "New Session",
    sessionDescription: sessionMeta.description || "",
    tasks: generatedTasks.map((task) => ({
      task: task.task,
      agent: task.agent,
      repoId: repo.id,
      model:
        task.agent === "issue-resolver"
          ? (settings?.default_issue_fixer_model ?? "")
          : task.agent === "pr-reviewer"
            ? (settings?.default_pr_model ?? "")
            : "",
    })),
  });

  const { instance } = await createProjectSessionInstance({
    userId: user.id,
    input,
    sessionCategory: sessionCat,
    terminate: true,
    terminateSetting: "issue",
    runtime: "sandbox",
  });

  return instance;
};
