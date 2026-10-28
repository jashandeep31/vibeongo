import {
  and,
  db,
  eq,
  gitRepos,
  inArray,
  projectGitRepos,
  projects,
} from "@repo/db";

export async function getProjectWorkspaceRepositories(
  userId: string,
  projectIds: string[],
  { includeOverview = false }: { includeOverview?: boolean } = {},
) {
  if (projectIds.length === 0) return [];

  // Select repository identity and optional documentation, never credentials.
  return db
    .select({
      projectId: projectGitRepos.project_id,
      id: gitRepos.id,
      full_name: gitRepos.full_name,
      type: gitRepos.type,
      ...(includeOverview ? { overview: gitRepos.overview } : {}),
    })
    .from(projectGitRepos)
    .innerJoin(projects, eq(projects.id, projectGitRepos.project_id))
    .innerJoin(gitRepos, eq(gitRepos.id, projectGitRepos.github_repo_id))
    .where(
      and(
        inArray(projects.id, projectIds),
        eq(projects.user_id, userId),
        eq(projects.deleted, false),
        eq(gitRepos.user_id, userId),
      ),
    )
    .orderBy(gitRepos.full_name);
}
