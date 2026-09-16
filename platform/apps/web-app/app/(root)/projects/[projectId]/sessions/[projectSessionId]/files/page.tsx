import { ProjectSessionFilesPage } from "@/components/project-session-files-page";

export default async function ProjectFilesRoute({
  params,
}: PageProps<"/projects/[projectId]/sessions/[projectSessionId]/files">) {
  const { projectId, projectSessionId } = await params;

  return (
    <ProjectSessionFilesPage
      projectId={projectId}
      projectSessionId={projectSessionId}
    />
  );
}
