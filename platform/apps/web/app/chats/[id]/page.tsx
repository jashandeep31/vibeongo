import ClientView from "./client-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <ClientView chatid={id} />;
}
