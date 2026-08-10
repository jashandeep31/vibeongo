import GithubRepoActivityView from "./client-view";

export default async function GithubRepoActivityPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;

  return <GithubRepoActivityView repoId={repoId} />;
}
