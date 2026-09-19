import TriggerDetails from "./client-view";

export default async function AutomationTriggerPage({
  params,
}: {
  params: Promise<{ automationId: string; triggerId: string }>;
}) {
  const { automationId, triggerId } = await params;

  return <TriggerDetails automationId={automationId} triggerId={triggerId} />;
}
