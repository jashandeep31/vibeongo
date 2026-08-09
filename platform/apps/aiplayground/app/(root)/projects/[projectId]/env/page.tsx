import EnvironmentFilesView from "./client-view";

export default async function EnvironmentFilesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <EnvironmentFilesView projectId={projectId} />;
}
