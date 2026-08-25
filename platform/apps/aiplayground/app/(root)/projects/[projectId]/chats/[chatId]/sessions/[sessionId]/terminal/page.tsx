import { ProjectTerminalPage } from "@/components/project-terminal-page";

export default async function OpencodeSessionTerminalRoute({
  params,
}: {
  params: Promise<{ projectId: string; chatId: string }>;
}) {
  const { projectId, chatId } = await params;

  return (
    <ProjectTerminalPage
      projectId={projectId}
      projectSessionId={chatId}
    />
  );
}
