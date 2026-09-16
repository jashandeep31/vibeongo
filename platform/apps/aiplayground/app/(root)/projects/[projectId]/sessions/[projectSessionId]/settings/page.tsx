import { ProjectSessionSettingsPage } from "@/components/project-session-settings-page";

export default async function ProjectSettingsRoute({
  params,
}: PageProps<"/projects/[projectId]/sessions/[projectSessionId]/settings">) {
  const { projectId, projectSessionId } = await params;

  return (
    <ProjectSessionSettingsPage
      projectId={projectId}
      projectSessionId={projectSessionId}
    />
  );
}
