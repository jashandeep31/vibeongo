import { ProjectSessionFilesPage } from "@/components/project-session-files-page";

export default async function ProjectFilesRoute({
  params,
}: PageProps<"/projects/[projectId]/chats/[chatId]/files">) {
  const { projectId, chatId } = await params;

  return (
    <ProjectSessionFilesPage projectId={projectId} projectSessionId={chatId} />
  );
}
