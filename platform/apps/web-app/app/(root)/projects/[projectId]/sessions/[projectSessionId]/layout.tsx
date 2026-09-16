import { RuntimeSessionProvider } from "@/components/runtime-session-provider";

export default async function ProjectSessionLayout({
  children,
  params,
}: LayoutProps<"/projects/[projectId]/sessions/[projectSessionId]">) {
  const { projectSessionId } = await params;

  return (
    <RuntimeSessionProvider projectSessionId={projectSessionId}>
      {children}
    </RuntimeSessionProvider>
  );
}
