import AutomationDetails from "./client-view";

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = await params;

  return <AutomationDetails automationId={automationId} />;
}
