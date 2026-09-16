import { notFound } from "next/navigation";
import GitRepoActivityDetailsView from "./client-view";

export default async function GitRepoActivityDetailsPage({
  params,
}: {
  params: Promise<{
    repoId: string;
    activityType: string;
    number: string;
  }>;
}) {
  const { repoId, activityType, number: numberParam } = await params;
  if (activityType !== "pull-requests" && activityType !== "issues") {
    notFound();
  }

  const number = Number(numberParam);
  if (!Number.isInteger(number) || number < 1) notFound();

  return (
    <GitRepoActivityDetailsView
      repoId={repoId}
      type={activityType === "issues" ? "issue" : "pr"}
      number={number}
    />
  );
}
