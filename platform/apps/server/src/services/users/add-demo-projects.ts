import {
  and,
  asc,
  db,
  eq,
  gitRepos,
  instanceRegions,
  instanceTypes,
  projectFileData,
  projectFiles,
  projectGitRepos,
  projects,
  sandboxRegions,
  sandboxTypes,
  users,
} from "@repo/db";
import { demoReposToFork } from "../../utils/constants.js";
import { ensureRepoForkToForgejo } from "../forgejo/repo-actions.js";
import { ensureForgejoUserAccount } from "../forgejo/user-actions.js";
import { createProjectWithConfigAndUserIdService } from "../project/create-project-service.js";
import { encryptData } from "../../lib/encryption-decryption.js";

type DemoProject = (typeof demoReposToFork)[number]["project"];
type DemoRepo = (typeof demoReposToFork)[number];

const ensureDemoProjectFiles = async (
  projectId: string,
  files: readonly { name: string; path: string; content: string }[],
) => {
  for (const file of files) {
    const [existingFile] = await db
      .select({ id: projectFiles.id })
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.project_id, projectId),
          eq(projectFiles.name, file.name),
          eq(projectFiles.path, file.path),
        ),
      )
      .limit(1);

    if (existingFile) continue;

    await db.transaction(async (tx) => {
      const [projectFile] = await tx
        .insert(projectFiles)
        .values({
          project_id: projectId,
          name: file.name,
          path: file.path,
        })
        .returning({ id: projectFiles.id });

      if (!projectFile) throw new Error("Demo project file was not created");

      const encryptedContent = encryptData(file.content);
      await tx.insert(projectFileData).values({
        project_file_id: projectFile.id,
        encrypted_content: encryptedContent.encryptedData,
        iv: encryptedContent.iv,
        tag: encryptedContent.tag,
        version: 1,
      });
    });
  }
};

export const createDemoProjectForUser = async ({
  userId,
  repoId,
  project,
}: {
  userId: string;
  repoId: string;
  project: DemoProject;
}) => {
  const [existingProject] = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(projectGitRepos, eq(projectGitRepos.project_id, projects.id))
    .where(
      and(
        eq(projects.user_id, userId),
        eq(projects.name, project.name),
        eq(projects.deleted, false),
        eq(projectGitRepos.github_repo_id, repoId),
      ),
    )
    .limit(1);

  if (existingProject) return existingProject;

  const [[awsRuntime], [e2bRuntime]] = await Promise.all([
    db
      .select({
        instanceTypeId: instanceTypes.id,
        regionId: instanceRegions.id,
      })
      .from(instanceTypes)
      .innerJoin(
        instanceRegions,
        and(
          eq(instanceRegions.id, instanceTypes.region_id),
          eq(instanceRegions.provider, "aws"),
        ),
      )
      .where(
        and(
          eq(instanceTypes.provider, "aws"),
          eq(instanceTypes.slug, "m6i.large"),
        ),
      )
      .orderBy(
        asc(instanceRegions.created_at),
        asc(instanceTypes.created_at),
        asc(instanceTypes.name),
      )
      .limit(1),
    db
      .select({ sandboxTypeId: sandboxTypes.id })
      .from(sandboxTypes)
      .innerJoin(
        sandboxRegions,
        and(
          eq(sandboxRegions.id, sandboxTypes.sandbox_region),
          eq(sandboxRegions.provider, "e2b"),
        ),
      )
      .where(eq(sandboxTypes.provider, "e2b"))
      .orderBy(
        asc(sandboxRegions.created_at),
        asc(sandboxTypes.created_at),
        asc(sandboxTypes.name),
      )
      .limit(1),
  ]);

  if (!awsRuntime)
    throw new Error(
      "No AWS m6i.large instance type with a valid region is configured",
    );
  if (!e2bRuntime)
    throw new Error("No E2B sandbox type with a valid region is configured");

  return createProjectWithConfigAndUserIdService(
    {
      ...project,
      provider: "aws",
      regionId: awsRuntime.regionId,
      instanceTypeId: awsRuntime.instanceTypeId,
      sandboxTypeId: e2bRuntime.sandboxTypeId,
      githubRepoIds: [repoId],
      sshKeyIds: [],
    },
    userId,
  );
};

const ensureGitRepoForUser = async ({
  user,
  fullName,
}: {
  user: typeof users.$inferSelect;
  fullName: string;
}) => {
  const findRepo = async () => {
    const [repo] = await db
      .select({ id: gitRepos.id })
      .from(gitRepos)
      .where(
        and(eq(gitRepos.user_id, user.id), eq(gitRepos.full_name, fullName)),
      )
      .limit(1);
    return repo;
  };

  const existingRepo = await findRepo();
  if (existingRepo) return existingRepo;

  const [insertedRepo] = await db
    .insert(gitRepos)
    .values({
      type: "forgejo",
      installation_id: 0,
      full_name: fullName,
      repo_owner_username: user.username,
      setup_script: "",
      public: true,
      user_id: user.id,
    })
    .onConflictDoNothing()
    .returning({ id: gitRepos.id });

  const repoRow = insertedRepo ?? (await findRepo());
  if (!repoRow) throw new Error("Demo repository was not saved");
  return repoRow;
};

const addDemoProjectToUserProfileUnchecked = async (
  user: typeof users.$inferSelect,
  repo: DemoRepo,
) => {
  const forkedRepo = await ensureRepoForkToForgejo({
    sourceRepoOwnername: repo.ownername,
    sourceReponame: repo.reponame,
    forkFor: user.username,
  });

  const repoRow = await ensureGitRepoForUser({
    user,
    fullName: forkedRepo.full_name,
  });

  const project = await createDemoProjectForUser({
    userId: user.id,
    repoId: repoRow.id,
    project: repo.project,
  });

  if ("files" in repo) {
    await ensureDemoProjectFiles(project.id, repo.files);
  }
};

export const addDemoProjectToUserProfile = async (
  user: typeof users.$inferSelect,
  repo: DemoRepo,
) => {
  await ensureForgejoUserAccount(user);
  await addDemoProjectToUserProfileUnchecked(user, repo);
};

export const addDemoProjectsToUserProfile = async (
  user: typeof users.$inferSelect,
) => {
  await ensureForgejoUserAccount(user);

  for (const repo of demoReposToFork) {
    await addDemoProjectToUserProfileUnchecked(user, repo);
  }
};
