import { ProjectSessionFilesPage } from "@/components/project-session-files-page";

export default async function ProjectSessionFilesRoute({
  params,
}: PageProps<"/projects/[projectId]/sessions/[projectSessionId]/chats/[opencodeSessionId]/files">) {
  const { projectId, projectSessionId, opencodeSessionId } = await params;

  return (
    <ProjectSessionFilesPage
      projectId={projectId}
      projectSessionId={projectSessionId}
      sessionId={opencodeSessionId}
    />
  );
}
