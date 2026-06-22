import { IssueCommentCreatedEvent } from "@octokit/webhooks-types";
import { WebhookHandler } from "../types.js";
import {
  and,
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
import { generateSessionNameAndDescription } from "../../../ai/ai-functions/get-session-name-and-description.js";
import { createSessionAuthToken } from "../../../lib/create-session-auth-token.js";
import { setupInstanceScript } from "../../../scripts/setup-instance-script.js";
import { spinUpAndSaveInstance } from "../../../services/instances/spin-up-and-save-instance.js";

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
      repo: githubRepos,
    })
    .from(githubRepos)
    .innerJoin(users, and(eq(users.username, commenterUsername)))
    .innerJoin(projects, eq(projects.id, githubRepos.default_project_id))
    .where(eq(githubRepos.full_name, repoFullName));

  if (!githubRepoWithUserAndProject) return;
  const { project, user, repo } = githubRepoWithUserAndProject;

  // checking if the commenter is the repo owner
  if (user.username !== commenterUsername) {
    //TODO: leave the comment on the github
    return;
  }

  // generating the name and the description of the sessoin
  const sessionMetadata = await generateSessionNameAndDescription(body);

  const session = await db.transaction(async (tx) => {
    // creating session in db
    const [session] = await tx
      .insert(projectSessions)
      .values({
        name: sessionMetadata.name || "New Session",
        description: sessionMetadata.description || "",
        user_id: user.id,
        project_id: project.id,
        category: "auto",
      })
      .returning();

    if (!session) throw new Error("Internal error");
    //TODO: automate the agent selection with the AI
    const tasks: (typeof projectSessionTasks.$inferInsert)[] = [
      {
        folder_name: repo.full_name.split("/")[1]!,
        task:
          `Here is the comment given by the user perform the actions as per it comment url: ${payload.comment.url}` +
          body,
        agent: "issue-resolver",
        project_session_id: session.id,
      },
      {
        folder_name: repo.full_name.split("/")[1]!,
        task: "Please you have done things as asked if not please complete those now",
        agent: "issue-resolver",
        project_session_id: session.id,
      },
    ];

    await tx.insert(projectSessionTasks).values(tasks);
    return session;
  });
  const authToken = await createSessionAuthToken(session.id);

  const sshKeysArray = await db
    .select()
    .from(projectSshKeys)
    .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id));

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

  await spinUpAndSaveInstance({
    setupScript: intialScript,
    project,
    userId: user.id,
    sessionId: session.id,
    instanceId,
    terminate: true,
  });
};
