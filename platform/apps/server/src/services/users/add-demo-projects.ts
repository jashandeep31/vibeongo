import { db, eq, gitRepos, instanceTypes, users } from "@repo/db";
import { demoReposToFork } from "../../utils/constants.js";
import { forkRepoToForgejo } from "../forgejo/repo-actions.js";
import { createProjectWithConfigAndUserIdService } from "../project/create-project-service.js";

type DemoProject = (typeof demoReposToFork)[number]["project"];

export const createDemoProjectForUser = async ({
  userId,
  repoId,
  project,
}: {
  userId: string;
  repoId: string;
  project: DemoProject;
}) => {
  const [instanceType] = await db
    .select({ regionId: instanceTypes.region_id })
    .from(instanceTypes)
    .where(eq(instanceTypes.id, project.instanceTypeId))
    .limit(1);

  if (!instanceType?.regionId) {
    throw new Error(
      `Demo project instance type ${project.instanceTypeId} has no region`,
    );
  }

  return createProjectWithConfigAndUserIdService(
    {
      ...project,
      regionId: instanceType.regionId,
      githubRepoIds: [repoId],
    },
    userId,
  );
};

export const addDemoProjectsToUserProfile = async (
  user: typeof users.$inferSelect,
) => {
  for (const repo of demoReposToFork) {
    // create a fork of repo
    const forkedRepo = await forkRepoToForgejo({
      sourceRepoOwnername: repo.ownername,
      sourceReponame: repo.reponame,
      forkFor: user.username,
    });
    if (forkedRepo.status === "ok") {
      const [repoRow] = await db
        .insert(gitRepos)
        .values({
          type: "forgejo",
          installation_id: 0,
          full_name: forkedRepo.repo.full_name,
          repo_owner_username: user.username,
          setup_script: "",
          public: true,
          user_id: user.id,
        })
        .returning({ id: gitRepos.id });

      if (!repoRow) throw new Error("Demo repository was not saved");

      await createDemoProjectForUser({
        userId: user.id,
        repoId: repoRow.id,
        project: repo.project,
      });
    }
  }
};
