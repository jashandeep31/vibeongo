import { App, PullRequestOpenedEvent } from "@octokit/webhooks-types";
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
import { createSessionAuthToken } from "../../../lib/create-session-auth-token.js";
import { setupInstanceScript } from "../../../scripts/setup-instance-script.js";
import { spinUpAndSaveInstance } from "../../../services/instances/spin-up-and-save-instance.js";
import { getSessionNameAndDescription } from "../../../ai/ai-functions/get-session-name-and-description.js";

export const pullRequestOpenedHandler = async (
  event: WebhookHandler<PullRequestOpenedEvent>,
) => {
  const { payload, octokit } = event;

  // checking if the body contains the tagging
  const body = payload?.pull_request?.body;
  if (!body) return;

  //   const res = await octokit.request(
  //     "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
  //     {
  //       owner: payload.repository.owner.login,
  //       repo: payload.repository.name,
  //       issue_number: payload.pull_request.number,
  //       body: `👋 Got it! I'm on it.
  // 🛠️ Fetching live logs for this pull request — this can take up to 5 minutes.
  // 🌐 You can monitor progress on the live website.`,
  //       headers: {
  //         "x-github-api-version": "2026-03-10",
  //       },
  //     },
  //   );
  //   const commentId = res.data.id;

  const prOpenerUsername = payload.pull_request?.user?.login;
  const full_name = payload.repository?.full_name;
  if (!prOpenerUsername || !full_name) {
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

  if (
    !row ||
    !row.repo ||
    !row.user ||
    !row.project ||
    !payload.pull_request.body
  ) {
    if (!row?.project)
      console.log(`
                                
Please add hte default project to the github repo
                                 
`);
    return;
  }
  const { project, user, repo } = row;

  const sessionMeta = await getSessionNameAndDescription(
    payload.pull_request.title + "\n" + payload.pull_request.body,
  );

  const session = await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(projectSessions)
      .values({
        name: sessionMeta.name || "New Session",
        description: sessionMeta.description || "",
        user_id: row.user.id,
        project_id: project.id,
      })
      .returning();
    if (!session) return;

    await tx.insert(projectSessionTasks).values({
      folder_name: repo.full_name.split("/")[1],
      task: `
      Hi the pull request is opened up with the following details:
      Title: ${payload.pull_request.title}
      URL: ${payload.pull_request.url}
      Body: ${payload.pull_request.body}
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

  await spinUpAndSaveInstance({
    setupScript: intialScript,
    project,
    userId: user.id,
    sessionId: session.id,
    instanceId,
  });
  return;
};
