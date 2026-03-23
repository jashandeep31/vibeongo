import ClientView from "./client-view";

export default async function Page({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = await params;
  return <ClientView instanceId={instanceId} />;
}
