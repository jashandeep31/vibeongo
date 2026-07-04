import {
  db,
  and,
  eq,
  githubRepos,
  instanceRegions,
  instanceTypes,
  projects,
  projectSessions,
  projectSessionsCategory,
  projectSessionTasks,
  projectSshKeys,
  sshKeys,
  users,
  userSettings,
} from "@repo/db";
import { createSessionAuthToken } from "../../lib/create-session-auth-token.js";
import {
  spinUpAndSaveInstance,
  spinUpAndSaveInstanceResponse,
} from "../instances/spin-up-and-save-instance.js";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";
import { getIssueDetailByIssueNumber } from "../../github-app-functions/get-issue-or-pull-request-detail-by-number.js";
import { getSessionNameAndDescriptionAgent } from "../../ai/ai-agents/common-agents.js";
import { createTasksForPRIssueOrCommentAgent } from "../../ai/ai-agents/create-tasks-for-pr-issue-or-comment-agent.js";

interface issueHandlerProps {
  gitRepoId: string;
  issueNumber: number;
  requestedByUserId?: string;
  sessionCat?: (typeof projectSessionsCategory.enumValues)[number];
}
/**
 * Receives the issue_id, then proccess as per that issue
 */
export const issueRequestHandler = async ({
  gitRepoId,
  issueNumber,
  requestedByUserId,
  sessionCat = "manual",
}: issueHandlerProps): Promise<spinUpAndSaveInstanceResponse> => {
  const [githubReposWithUserAndProject] = await db
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

  if (!githubReposWithUserAndProject) throw new Error("repo not found");
  const { project, user, repo } = githubReposWithUserAndProject;
  if (!project || !user || !repo) throw new Error("repo not found");

  const issue = await getIssueDetailByIssueNumber({
    installation_id: repo.installation_id,
    issue_number: issueNumber,
    full_repo_name: repo.full_name,
  });

  const sessionMeta = await getSessionNameAndDescriptionAgent(
    issue.title + "\n" + issue.body,
  );

  const session = await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(projectSessions)
      .values({
        name: sessionMeta.name || "New Session",
        description: sessionMeta.description || "",
        user_id: githubReposWithUserAndProject.user.id,
        project_id: project.id,
        category: sessionCat,
      })
      .returning();
    if (!session) return;

    const [userSettingsRow] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, user.id));
    const tasks = await createTasksForPRIssueOrCommentAgent(
      "issue",
      `${issue.url}  body: ${issue.body}`,
    );

    await tx.insert(projectSessionTasks).values(
      tasks.map((t, index): typeof projectSessionTasks.$inferInsert => {
        let model = "";
        if (
          t.agent === "issue-resolver" &&
          userSettingsRow?.default_issue_fixer_model
        ) {
          model = userSettingsRow?.default_issue_fixer_model;
        }
        if (t.agent === "pr-reviewer" && userSettingsRow?.default_pr_model) {
          model = userSettingsRow?.default_pr_model;
        }

        return {
          folder_name: repo.full_name.split("/")[1] ?? "",
          task: t.task,
          agent: t.agent,
          model,
          project_session_id: session.id,
          done: false,
          order_number: index,
        };
      }),
    );
    return session;
  });
  if (!session) return null;
  const authToken = await createSessionAuthToken(session.id);

  const sshKeysArray = await db
    .select()
    .from(projectSshKeys)
    .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
    .where(eq(projectSshKeys.project_id, project.id));

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
  if (!regionRow || !regionRow.instance_regions) return null;

  const instance = await spinUpAndSaveInstance({
    setupScript: intialScript,
    project,
    userId: user.id,
    sessionId: session.id,
    instanceId,
    terminate: true,
  });
  return instance;
};

// Title: ${payload.issue.title}
// URL: ${payload.issue.url}
// Body: ${payload.issue.body}
