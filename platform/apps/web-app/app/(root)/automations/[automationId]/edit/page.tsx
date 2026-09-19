import EditAutomation from "./client-view";

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = await params;
  return <EditAutomation automationId={automationId} />;
}
