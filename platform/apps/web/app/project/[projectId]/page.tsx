import ClientView from "./client-view";

interface pageProps {
  params: Promise<{ projectId: string }>;
}
export default async function page({ params }: pageProps) {
  const { projectId } = await params;

  return <ClientView projectId={projectId} />;
}
