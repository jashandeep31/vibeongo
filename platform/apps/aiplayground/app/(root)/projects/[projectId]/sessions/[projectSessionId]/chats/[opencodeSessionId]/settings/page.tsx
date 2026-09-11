import { ProjectSessionSettingsPage } from "@/components/project-session-settings-page";

export default async function ProjectSessionSettingsRoute({
  params,
}: PageProps<"/projects/[projectId]/sessions/[projectSessionId]/chats/[opencodeSessionId]/settings">) {
  const { projectId, projectSessionId, opencodeSessionId } = await params;

  return (
    <ProjectSessionSettingsPage
      projectId={projectId}
      projectSessionId={projectSessionId}
      sessionId={opencodeSessionId}
    />
  );
}
