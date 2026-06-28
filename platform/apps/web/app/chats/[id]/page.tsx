import ClientView from "./client-view";

interface PageProps {
  params: Promise<{ chatid: string }>;
}

export default async function Page({ params }: PageProps) {
  const { chatid } = await params;

  return <ClientView chatid={chatid} />;
}
