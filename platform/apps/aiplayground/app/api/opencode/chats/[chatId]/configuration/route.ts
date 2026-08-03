import {
  getOpencodeServerClient,
  getOpencodeServerUrl,
} from "@/services/opencode-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    const client = getOpencodeServerClient(
      chatId,
      getOpencodeServerUrl(request),
    );
    const [providerResponse, agentsResponse] = await Promise.all([
      client.provider.list(),
      client.app.agents(),
    ]);

    if (providerResponse.error || !providerResponse.data) {
      return new Response("Could not load OpenCode providers", { status: 502 });
    }

    if (agentsResponse.error) {
      return new Response("Could not load OpenCode agents", { status: 502 });
    }

    const connected = new Set(providerResponse.data.connected);
    const models = providerResponse.data.all.flatMap((provider) => {
      if (!connected.has(provider.id)) return [];

      return Object.values(provider.models).map((model) => ({
        id: `${provider.id}/${model.id}`,
        providerID: provider.id,
        modelID: model.id,
        name: model.name,
        providerName: provider.name,
        variants: Object.keys(model.variants ?? {}),
      }));
    });
    const hiddenAgentNames = new Set(["compaction", "title", "summary"]);
    const agents = (agentsResponse.data ?? [])
      .filter(
        (agent) =>
          agent.mode === "primary" && !hiddenAgentNames.has(agent.name),
      )
      .map((agent) => ({
        id: agent.name,
        name: agent.name,
        description: agent.description,
        mode: agent.mode,
      }));

    return Response.json({ models, agents });
  } catch (error) {
    console.error("OpenCode configuration load failed", error);
    return new Response("OpenCode configuration load failed", { status: 500 });
  }
}
