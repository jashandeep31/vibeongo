import { ProjectSessionSettingsPage } from "@/components/project-session-settings-page";

export default async function ProjectSessionSettingsRoute({
  params,
}: PageProps<"/projects/[projectId]/chats/[chatId]/sessions/[sessionId]/settings">) {
  const { projectId, chatId, sessionId } = await params;

  return (
    <ProjectSessionSettingsPage
      projectId={projectId}
      projectSessionId={chatId}
      sessionId={sessionId}
    />
  );
}
