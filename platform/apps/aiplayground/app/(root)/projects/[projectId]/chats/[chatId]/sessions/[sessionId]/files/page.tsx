import { ProjectSessionFilesPage } from "@/components/project-session-files-page";

export default async function ProjectSessionFilesRoute({
  params,
}: PageProps<"/projects/[projectId]/chats/[chatId]/sessions/[sessionId]/files">) {
  const { projectId, chatId, sessionId } = await params;

  return (
    <ProjectSessionFilesPage
      projectId={projectId}
      projectSessionId={chatId}
      sessionId={sessionId}
    />
  );
}
