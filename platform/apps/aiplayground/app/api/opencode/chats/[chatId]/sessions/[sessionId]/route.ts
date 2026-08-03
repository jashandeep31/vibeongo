import { getOpencodeServerClient } from "@/services/opencode-server";

type RouteParams = {
  params: Promise<{ chatId: string; sessionId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { chatId, sessionId } = await params;
    const client = getOpencodeServerClient(chatId);
    const [sessionResult, messagesResult, changesResult] = await Promise.all([
      client.session.get({ sessionID: sessionId }),
      client.session.messages({ sessionID: sessionId, limit: 100 }),
      client.session.diff({ sessionID: sessionId }),
    ]);

    if (sessionResult.error || !sessionResult.data) {
      return new Response("Could not load OpenCode session", { status: 502 });
    }

    if (messagesResult.error) {
      return new Response("Could not load OpenCode messages", { status: 502 });
    }

    if (changesResult.error) {
      return new Response("Could not load OpenCode changes", { status: 502 });
    }

    return Response.json({
      session: sessionResult.data,
      messages: messagesResult.data ?? [],
      changes: changesResult.data ?? [],
    });
  } catch (error) {
    console.error("OpenCode session load failed", error);
    return new Response("OpenCode session load failed", { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { chatId, sessionId } = await params;
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text !== "string" || !body.text.trim()) {
      return new Response("Prompt text is required", { status: 400 });
    }

    const client = getOpencodeServerClient(chatId);
    const result = await client.session.promptAsync({
      sessionID: sessionId,
      parts: [{ type: "text", text: body.text.trim() }],
    });

    if (result.error) {
      return new Response("Could not send OpenCode prompt", { status: 502 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("OpenCode prompt failed", error);
    return new Response("OpenCode prompt failed", { status: 500 });
  }
}
