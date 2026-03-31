import { db, eq, githubRepos, users } from "@repo/db";
import { octokitApp } from "./webhooks/github/handler.js";

export default async function test() {
  console.log(`Test server in running`);

  // --- Please remove this line if you wanna run the function ----
  if (1 === 1) return;
  const res = await octokitApp.eachRepository(async (repo) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, repo.repository.owner.login));

    if (!user) {
      return;
    }
    const [isRepo] = await db
      .select()
      .from(githubRepos)
      .where(eq(githubRepos.full_name, repo.repository.full_name));

    if (!isRepo) {
      await db.insert(githubRepos).values({
        user_id: user.id,
        full_name: repo.repository.full_name,
        repo_owner_username: repo.repository.owner.login,
      });
    }
  });
}
