import ProjectForm from "../../create/client-view";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <ProjectForm projectId={projectId} />;
}
