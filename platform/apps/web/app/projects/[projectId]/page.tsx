import ClientView from "./client-view";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { projectId } = await params;

  return <ClientView projectId={projectId} />;
}
