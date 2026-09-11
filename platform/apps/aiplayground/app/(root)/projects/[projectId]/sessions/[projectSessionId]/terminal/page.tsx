import { ProjectTerminalPage } from "@/components/project-terminal-page";

export default async function ProjectTerminalRoute({
  params,
}: {
  params: Promise<{ projectId: string; projectSessionId: string }>;
}) {
  const { projectId, projectSessionId } = await params;

  return (
    <ProjectTerminalPage
      projectId={projectId}
      projectSessionId={projectSessionId}
    />
  );
}
