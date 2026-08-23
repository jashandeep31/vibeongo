import { db, gitRepos, users } from "@repo/db";
import { demoReposToFork } from "../../utils/constants.js";
import { forkRepoToForgejo } from "../forgejo/repo-actions.js";

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
    console.log(forkedRepo);
    if (forkedRepo.status === "ok") {
      await db.insert(gitRepos).values({
        type: "forgejo",
        installation_id: 0,
        full_name: forkedRepo.repo.full_name,
        repo_owner_username: user.username,
        setup_script: ``,
        public: true,
        user_id: user.id,
      });
    }
  }
};
