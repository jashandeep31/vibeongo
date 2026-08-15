import { useLocalSearchParams } from "expo-router";

import { GithubRepoActivityScreen } from "@/components/github-repos/github-repo-activity-screen";

export default function GithubRepoRoute() {
  const { repoId } = useLocalSearchParams<{ repoId: string }>();
  return <GithubRepoActivityScreen repoId={repoId} />;
}
