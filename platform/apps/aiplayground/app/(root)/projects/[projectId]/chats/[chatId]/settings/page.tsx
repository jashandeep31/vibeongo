import { ProjectSessionSettingsPage } from "@/components/project-session-settings-page";

export default async function ProjectSettingsRoute({
  params,
}: PageProps<"/projects/[projectId]/chats/[chatId]/settings">) {
  const { projectId, chatId } = await params;

  return (
    <ProjectSessionSettingsPage
      projectId={projectId}
      projectSessionId={chatId}
    />
  );
}
