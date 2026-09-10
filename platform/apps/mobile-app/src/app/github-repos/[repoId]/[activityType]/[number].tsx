import { useLocalSearchParams } from "expo-router";

import { GitRepoActivityDetailsScreen } from "@/components/github-repos/git-repo-activity-details-screen";

export default function GitRepoActivityDetailsRoute() {
  const params = useLocalSearchParams<{
    repoId: string;
    activityType: string;
    number: string;
  }>();
  const number = Number(params.number);
  const type = params.activityType === "issues" ? "issue" : "pr";

  return (
    <GitRepoActivityDetailsScreen
      repoId={params.repoId}
      type={type}
      number={number}
    />
  );
}
